/**
 * Granola meeting transcript integration via local cache.
 *
 * Reads from Granola's cache file at ~/Library/Application Support/Granola/cache-v3.json
 * instead of hitting the API. The cache is maintained by the Granola desktop app.
 *
 * The cache is double-encoded: { cache: "<JSON string>" } where the inner JSON
 * contains { state: { documents: {...}, transcripts: {...} } }.
 */

import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './utils/logger';
import type {
	GranolaDocument,
	GranolaTranscript,
	GranolaResult,
} from '../shared/granola-types';

const LOG_CONTEXT = '[Granola]';

const CACHE_PATH = path.join(app.getPath('appData'), 'Granola', 'cache-v3.json');

// Raw cache types (internal only)
interface CacheDoc {
	id: string;
	title?: string;
	created_at?: string;
	deleted_at?: string | null;
	people?: Array<{ name?: string; email?: string }>;
}

interface CacheSegment {
	text?: string;
	source?: string;
	start_timestamp?: number;
	end_timestamp?: number;
}

interface CacheState {
	documents?: Record<string, CacheDoc>;
	transcripts?: Record<string, CacheSegment[]>;
}

// In-memory cache to avoid re-parsing the 11MB file on every request
let cachedState: CacheState | null = null;
let cachedMtimeMs = 0;

function parseEpoch(value: string | undefined): number {
	if (!value) return Date.now();
	const ms = new Date(value).getTime();
	return Number.isNaN(ms) ? Date.now() : ms;
}

async function granolaAppDir(): Promise<boolean> {
	try {
		await fsPromises.access(path.join(app.getPath('appData'), 'Granola'));
		return true;
	} catch {
		return false;
	}
}

async function loadCache(): Promise<{ state: CacheState; ageMs: number } | { error: 'not_installed' | 'cache_not_found' | 'cache_parse_error' }> {
	// Check if Granola app directory exists
	if (!(await granolaAppDir())) {
		return { error: 'not_installed' };
	}

	let stat;
	try {
		stat = await fsPromises.stat(CACHE_PATH);
	} catch {
		return { error: 'cache_not_found' };
	}

	const ageMs = Date.now() - stat.mtimeMs;

	// Return in-memory cache if file hasn't changed
	if (cachedState && stat.mtimeMs === cachedMtimeMs) {
		return { state: cachedState, ageMs };
	}

	try {
		const raw = await fsPromises.readFile(CACHE_PATH, 'utf-8');
		const outer = JSON.parse(raw) as { cache?: string };
		if (typeof outer.cache !== 'string') {
			logger.error('Cache file missing "cache" string field', LOG_CONTEXT);
			return { error: 'cache_parse_error' };
		}

		const inner = JSON.parse(outer.cache) as { state?: CacheState };
		if (!inner.state) {
			logger.error('Cache inner JSON missing "state" field', LOG_CONTEXT);
			return { error: 'cache_parse_error' };
		}

		cachedState = inner.state;
		cachedMtimeMs = stat.mtimeMs;
		return { state: cachedState, ageMs };
	} catch (err) {
		logger.error(`Failed to parse Granola cache: ${err}`, LOG_CONTEXT);
		return { error: 'cache_parse_error' };
	}
}

export async function getRecentMeetings(
	limit = 50
): Promise<GranolaResult<GranolaDocument[]>> {
	const result = await loadCache();
	if ('error' in result) return { success: false, error: result.error };

	const { state, ageMs } = result;
	const docs = state.documents || {};
	const transcripts = state.transcripts || {};

	const meetings: GranolaDocument[] = Object.values(docs)
		.filter((doc): doc is CacheDoc & { id: string } => !!doc.id && !doc.deleted_at)
		.map((doc) => ({
			id: doc.id,
			title: doc.title || 'Untitled Meeting',
			createdAt: parseEpoch(doc.created_at),
			participants: (doc.people || []).map((p) => p.name || p.email || 'Unknown'),
			hasTranscript: Array.isArray(transcripts[doc.id]) && transcripts[doc.id].length > 0,
		}))
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, limit);

	return { success: true, data: meetings, cacheAge: ageMs };
}

export async function getTranscript(
	documentId: string
): Promise<GranolaResult<GranolaTranscript>> {
	const result = await loadCache();
	if ('error' in result) return { success: false, error: result.error };

	const { state, ageMs } = result;
	const segments = state.transcripts?.[documentId];

	if (!Array.isArray(segments) || segments.length === 0) {
		return { success: false, error: 'cache_not_found' };
	}

	const plainText = segments
		.map((s: CacheSegment) => s.text || '')
		.filter(Boolean)
		.join('\n');

	return {
		success: true,
		data: { documentId, plainText },
		cacheAge: ageMs,
	};
}
