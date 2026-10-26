import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body?.suggestionId) return Response.json({ error: 'suggestionId is required' }, { status: 400 });

    const suggestion = await base44.entities.ProjectSuggestion.get(body.suggestionId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!suggestion) return Response.json({ error: 'Suggestion not found' }, { status: 404 });

    if (suggestion.userId !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: this suggestion belongs to another user' }, { status: 403 });
    }
    if (suggestion.status !== 'pending') {
      return Response.json({ error: 'This suggestion was already handled' }, { status: 400 });
    }

    const project = await base44.entities.Project.get(suggestion.projectId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const asArray = (res) => (Array.isArray(res) ? res : (res?.items || []));
    const contentionRes = await base44.entities.Contention.filter({ projectId: project.id }, { limit: 10, sort: '-created_date' }).catch(() => []);
    const docRes = await base44.entities.OtherDocument.filter({ projectId: project.id }, { limit: 8, sort: '-created_date' }).catch(() => []);
    const contentions = asArray(contentionRes);
    const otherDocs = asArray(docRes);

    const contextParts = [];
    contentions.slice(0, 6).forEach((c, i) => {
      contextParts.push(`${i + 1}. ${c.title}${c.claim ? ` — Claim: ${c.claim}` : ''}${c.warrant ? ` | Warrant: ${c.warrant}` : ''}${c.impact ? ` | Impact: ${c.impact}` : ''}`);
    });
    otherDocs.slice(0, 4).forEach(d => {
      contextParts.push(`Doc "${d.title}": ${(d.content || '').slice(0, 300)}`);
    });

    const prompt = `You are an elite debate coach. A coaching suggestion was just approved by a debater. Your job is to IMPLEMENT it — write the actual updated material, not advice about it.

PROJECT: ${project.name}
FORMAT: ${project.format || 'debate'}
RESOLUTION: ${project.resolution || 'N/A'}
SIDE: ${project.side || 'N/A'}

APPROVED SUGGESTION:
Title: ${suggestion.title}
Advice: ${suggestion.description}

CURRENT PROJECT MATERIAL:
${contextParts.join('\n') || 'No material saved yet — write the new material this suggestion calls for.'}

Write a markdown document that implements this suggestion concretely, with exactly these sections:
- "## What This Does" — 2-3 sentences explaining what was implemented and why it wins rounds.
- "## Implemented Material" — the actual finished text: fully rewritten or new contentions (each with a title, claim, warrant, impact, and evidence), revised framing/definitions, new evidence lines, rebuttal blocks, or flow notes — whatever THIS specific suggestion calls for, ready to use in round. Ground every claim in the resolution and existing material.
- "## How to Use It" — 2-4 practical steps for folding this into their prep.

Reply ONLY with valid JSON exactly matching: {"title": "short document title", "content": "the full markdown document"}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['title', 'content'],
      },
    }).catch(() => null);

    if (!res || !res.content) {
      return Response.json({ error: 'Failed to implement suggestion — please try again' }, { status: 500 });
    }

    await base44.entities.OtherDocument.create({
      title: res.title || `Applied Fix — ${suggestion.title}`,
      docLabel: 'AI Coach Fix',
      description: suggestion.description || suggestion.title,
      content: res.content,
      projectId: project.id,
      ownerUserId: project.ownerUserId,
    });

    await base44.entities.ProjectSuggestion.update(suggestion.id, { status: 'approved' });

    return Response.json({ success: true, documentTitle: res.title });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}