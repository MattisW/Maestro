/**
 * Granola meeting transcript integration.
 *
 * Two functions to fetch meeting documents and transcripts from Granola's API.
 * Auth token read from ~/Library/Application Support/Granola/supabase.json.
 */

import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './utils/logger';
import type {
	GranolaDocument,
	GranolaTranscript,
	GranolaResult,
	GranolaErrorType,
} from '../shared/granola-types';

const LOG_CONTEXT = '[Granola]';
const API_BASE = 'https://api.granola.ai';

const DEFAULT_TOKEN_PATH = path.join(app.getPath('appData'), 'Granola', 'supabase.json');

// Raw API response types (not exported - internal contract documentation)
interface GranolaRawDocument {
	id: string;
	title?: string;
	created_at?: string;
	people?: Array<{ name?: string; email?: string }>;
}

interface GranolaRawSegment {
	text?: string;
	source?: string;
	start_timestamp?: number;
	end_timestamp?: number;
}

async function readToken(tokenPath: string): Promise<string | null> {
	try {
		const raw = await fsPromises.readFile(tokenPath, 'utf-8');
		const data = JSON.parse(raw);
		// Token is in workos_tokens which may be a JSON string
		let workosTokens = data.workos_tokens;
		if (typeof workosTokens === 'string') {
			workosTokens = JSON.parse(workosTokens);
		}
		return workosTokens?.access_token || null;
	} catch (err) {
		logger.warn(`Failed to read Granola token: ${err}`, LOG_CONTEXT);
		return null;
	}
}

async function tokenFileExists(tokenPath: string): Promise<boolean> {
	try {
		await fsPromises.access(tokenPath);
		return true;
	} catch {
		return false;
	}
}

function errorType(error: unknown): GranolaErrorType {
	if (error instanceof TypeError && String(error).includes('fetch')) {
		return 'network_error';
	}
	return 'api_error';
}

function parseEpoch(value: string | undefined): number {
	if (!value) return Date.now();
	const ms = new Date(value).getTime();
	return Number.isNaN(ms) ? Date.now() : ms;
}

async function resolveToken(tokenPath: string): Promise<{ token: string } | { error: GranolaErrorType }> {
	const token = await readToken(tokenPath);
	if (token) return { token };
	return { error: (await tokenFileExists(tokenPath)) ? 'auth_expired' : 'not_installed' };
}

export async function getRecentMeetings(
	tokenPath = DEFAULT_TOKEN_PATH,
	limit = 50
): Promise<GranolaResult<GranolaDocument[]>> {
	const resolved = await resolveToken(tokenPath);
	if ('error' in resolved) return { success: false, error: resolved.error };
	const { token } = resolved;

	try {
		const response = await fetch(`${API_BASE}/v2/get-documents`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ limit }),
		});

		if (response.status === 401 || response.status === 403) {
			return { success: false, error: 'auth_expired' };
		}
		if (!response.ok) {
			logger.error(`Granola API error: ${response.status}`, LOG_CONTEXT);
			return { success: false, error: 'api_error' };
		}

		const body = (await response.json()) as { docs?: GranolaRawDocument[] };
		if (!body.docs) {
			logger.error('Unexpected Granola API response: missing docs field', LOG_CONTEXT);
			return { success: false, error: 'api_error' };
		}

		const docs: GranolaDocument[] = body.docs.map((doc: GranolaRawDocument) => ({
			id: doc.id,
			title: doc.title || 'Untitled Meeting',
			createdAt: parseEpoch(doc.created_at),
			participants: (doc.people || []).map((p) => p.name || p.email || 'Unknown'),
		}));

		return { success: true, data: docs };
	} catch (error) {
		logger.error(`Failed to fetch Granola documents: ${error}`, LOG_CONTEXT);
		return { success: false, error: errorType(error) };
	}
}

export async function getTranscript(
	documentId: string,
	tokenPath = DEFAULT_TOKEN_PATH
): Promise<GranolaResult<GranolaTranscript>> {
	const resolved = await resolveToken(tokenPath);
	if ('error' in resolved) return { success: false, error: resolved.error };
	const { token } = resolved;

	try {
		const response = await fetch(`${API_BASE}/v1/get-document-transcript`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ document_id: documentId }),
		});

		if (response.status === 401 || response.status === 403) {
			return { success: false, error: 'auth_expired' };
		}
		if (!response.ok) {
			logger.error(`Granola transcript API error: ${response.status}`, LOG_CONTEXT);
			return { success: false, error: 'api_error' };
		}

		const segments = (await response.json()) as GranolaRawSegment[] | unknown;
		const segmentArray = Array.isArray(segments) ? (segments as GranolaRawSegment[]) : [];
		const plainText = segmentArray.map((s: GranolaRawSegment) => s.text || '').join('\n');

		return {
			success: true,
			data: { documentId, plainText },
		};
	} catch (error) {
		logger.error(`Failed to fetch Granola transcript: ${error}`, LOG_CONTEXT);
		return { success: false, error: errorType(error) };
	}
}
