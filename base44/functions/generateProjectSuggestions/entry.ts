import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

const MAX_PENDING_QUEUE = 10;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));

        // ── ON-DEMAND: generate suggestions for a single project (owner or admin) ──
        if (body?.projectId) {
            const user = await base44.auth.me().catch(() => null);
            if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

            const project = await base44.asServiceRole.entities.Project.get(body.projectId).catch(() => null);
            if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

            const isOwner = project.created_by_id === user.id || project.ownerUserId === user.id || user.role === 'admin';
            if (!isOwner) return Response.json({ error: 'Forbidden: You do not own this project' }, { status: 403 });

            if (project.isArchived) {
                return Response.json({ error: 'This project is archived. Unarchive it to generate suggestions.' }, { status: 400 });
            }

            // Cap the user's approval queue at MAX_PENDING_QUEUE
            const pending = await base44.asServiceRole.entities.ProjectSuggestion.filter({ userId: user.id, status: 'pending' });
            if (pending.length >= MAX_PENDING_QUEUE) {
                return Response.json({
                    success: true,
                    processed: 0,
                    message: `Your suggestion queue is full (${MAX_PENDING_QUEUE}). Approve or dismiss some suggestions first.`
                });
            }

            const created = await generateForProject(base44, project, MAX_PENDING_QUEUE - pending.length);
            return Response.json({ success: true, processed: created });
        }

        // ── GLOBAL: daily scheduled run over all projects (admin) ──
        const user = await base44.auth.me().catch(() => null);
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const projects = await base44.asServiceRole.entities.Project.list();
        const pendingCountByUser = {};
        let processed = 0;

        for (const project of projects) {
            // Never generate suggestions for archived projects
            if (project.isArchived) continue;

            const ownerId = project.created_by_id || project.ownerUserId;
            if (!ownerId) continue;

            // Respect the per-user pending queue cap
            if (pendingCountByUser[ownerId] === undefined) {
                const pending = await base44.asServiceRole.entities.ProjectSuggestion.filter({ userId: ownerId, status: 'pending' });
                pendingCountByUser[ownerId] = pending.length;
            }
            if (pendingCountByUser[ownerId] >= MAX_PENDING_QUEUE) continue;

            const created = await generateForProject(base44, project, MAX_PENDING_QUEUE - pendingCountByUser[ownerId]);
            pendingCountByUser[ownerId] += created;
            processed += created;
        }

        return Response.json({ success: true, processed });
    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function generateForProject(base44, project, maxSuggestions) {
    if (maxSuggestions <= 0) return 0;

    const contentions = await base44.asServiceRole.entities.Contention.filter({ projectId: project.id }).catch(() => []);

    const prompt = `Review this debate project and suggest up to ${Math.min(2, maxSuggestions)} specific improvements, fixes, or strategy updates. Focus on arguments, evidence, or flow.
Project Name: ${project.name}
Description: ${project.description || 'N/A'}
Resolution: ${project.resolution || 'N/A'}
Side: ${project.side || 'N/A'}

Contentions:
${contentions.map(c => `- ${c.title}`).join('\n')}

Reply ONLY with valid JSON exactly matching this schema:
{"suggestions": [{"title": "Short title", "description": "Detailed actionable advice on what to fix or update"}]}
`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
            type: "object",
            properties: {
                suggestions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" }
                        },
                        required: ["title", "description"]
                    }
                }
            },
            required: ["suggestions"]
        }
    }).catch(() => null);

    if (!res || !res.suggestions) return 0;

    const ownerId = project.created_by_id || project.ownerUserId;
    let created = 0;
    for (const sug of res.suggestions.slice(0, maxSuggestions)) {
        await base44.asServiceRole.entities.ProjectSuggestion.create({
            projectId: project.id,
            projectName: project.name,
            title: sug.title,
            description: sug.description,
            userId: ownerId,
            created_by_id: ownerId, // Ensure user can see it
            status: "pending"
        });
        created++;
    }
    return created;
}