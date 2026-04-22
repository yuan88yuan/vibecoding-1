export interface Env {
	vibecoding_db: D1Database;
	OPENROUTER_API_KEY: string;
	JWT_SECRET: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			const path = url.pathname;

			// 1. Auth Middleware
			const authCookie = request.headers.get('Cookie');
			const token = authCookie?.match(/auth_token=([^;]+)/)?.[1];
			let user = null;
			if (token && env.JWT_SECRET) {
				try {
					user = verifyToken(token, env.JWT_SECRET);
				} catch (e) {
					// Silent fail for token verification
				}
			}

			// --- Public Routes ---
			if (path === '/login') return handleLoginPage();
			if (path === '/logout') return handleLogout();
			if (path === '/api/login' && request.method === 'POST') return handleLogin(request, env);
			if (path === '/api/register' && request.method === 'POST') return handleRegister(request, env);
			if (path === '/user/new') return handleCreateUserPage();
			if (path === '/api/register-user' && request.method === 'POST') return handleRegisterUser(request, env);

			// --- Protected Routes ---
			if (!user) {
				return new Response(null, { 
					status: 302, 
					headers: { 'Location': new URL('/login', request.url).toString() } 
				});
			}

			// Admin Routes
			if (path === '/admin') {
				if (user.role !== 'admin') return new Response('Forbidden', { status: 403 });
				return handleAdminPage(env);
			}

			// User Management
			if (path.startsWith('/user/')) {
				const username = path.split('/')[2];
				if (username) return handleUserProfile(username, env);
			}
			if (path === '/api/user' && request.method === 'POST') return handleUserUpdate(request, env);

			// Agent Management
			if (path === '/agent/new') return handleCreateAgentPage(env);
			if (path.startsWith('/agent/')) {
				const agentId = path.split('/')[2];
				if (agentId && agentId !== 'new') {
					if (request.method === 'GET') return handleAgentPage(agentId, env);
					if (request.method === 'POST') return handleAgentChat(request, agentId, env);
				}
			}
			if (path === '/api/agent' && request.method === 'POST') return handleAgentUpdate(request, env);
			
			// Spec Management
			if (path === '/api/spec/add' && request.method === 'POST') return handleAddSpec(request, env);
			if (path === '/api/spec/remove' && request.method === 'POST') return handleRemoveSpec(request, env);

			if (path === '/' || path === '/index') return handleHomepage(env);

			return new Response('Not Found', { status: 404 });
		} catch (err: any) {
			return new Response(JSON.stringify({ 
				error: 'Worker Error', 
				message: err.message, 
				stack: err.stack 
			}), { 
				status: 500, 
				headers: { 'Content-Type': 'application/json' } 
			});
		}
	},
};

// --- AI Tool Executor ---
async function executeToolCall(specJson: string, params: any): Promise<string> {
	try {
		const spec = JSON.parse(specJson);
		let url = '';
		let method = 'GET';

		if (spec.paths) {
			const paths = Object.keys(spec.paths);
			const path = paths[0];
			const methods = Object.keys(spec.paths[path]);
			const httpMethod = methods[0].toUpperCase();
			url = (spec.servers?.[0]?.url || '') + path;
			method = httpMethod;
		} else if (spec.url) {
			url = spec.url;
			method = (spec.method || 'GET').toUpperCase();
		} else {
			throw new Error('Unsupported spec format. Please provide a valid OpenAPI spec or {url, method} object.');
		}

		const options: any = { method };
		if (method === 'GET') {
			const query = new URLSearchParams(params).toString();
			if (query) url += `?${query}`;
		} else {
			options.headers = { 'Content-Type': 'application/json' };
			options.body = JSON.stringify(params);
		}

		const response = await fetch(url, options);
		const text = await response.text();
		if (!response.ok) return `Error ${response.status}: ${text}`;
		try {
			return JSON.stringify(JSON.parse(text));
		} catch {
			return text;
		}
	} catch (e: any) {
		return `Execution Error: ${e.message}`;
	}
}

function generateToken(payload: any, secret: string) {
	const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 }));
	const signature = btoa(secret + header + body);
	return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, secret: string) {
	const [header, body, signature] = token.split('.');
	if (!header || !body || !signature) throw new Error('Malformed token');
	if (signature !== btoa(secret + header + body)) throw new Error('Invalid token');
	const payload = JSON.parse(atob(body));
	if (payload.exp < Date.now()) throw new Error('Expired token');
	return payload;
}

// --- HTML Layout ---
function layout(title: string, body: string) {
	return `
	<!DOCTYPE html>
	<html>
	<head>
		<title>${title}</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
			body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; background: #fcfcfc; }
			h1 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
			.card { border: 1px solid #ddd; padding: 20px; border-radius: 12px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; }
			.btn { background: #2ea44f; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; border: none; cursor: pointer; font-weight: bold; }
			.btn-secondary { background: #f6f8fa; color: #24292f; border: 1px solid #d0d7de; }
			.btn-danger { background: #cf222e; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 0.8rem; }
			input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-family: inherit; }
			ul { list-style: none; padding: 0; }
			li { margin: 10px 0; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
			.chat-container { display: flex; flex-direction: column; height: 500px; border: 1px solid #ddd; border-radius: 12px; background: #fff; overflow: hidden; }
			.chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
			.message { max-width: 85%; padding: 10px 15px; border-radius: 18px; font-size: 0.95rem; }
			.user-msg { align-self: flex-end; background: #007aff; color: white; }
			.ai-msg { align-self: flex-start; background: #e9e9eb; color: black; }
			.tool-msg { align-self: center; background: #fffbe6; border: 1px solid #ffe58f; color: #856404; font-size: 0.8rem; font-family: monospace; text-align: center; }
			.chat-input { display: flex; padding: 15px; border-top: 1px solid #ddd; gap: 10px; }
		</style>
	</head>
	<body>
		<nav><a href="/" style="text-decoration:none; color:#0366d6; font-weight:bold;">🏠 Home</a> | <a href="/logout" style="text-decoration:none; color:#666;">Logout</a></nav>
		<div style="margin-top:20px;">${body}</div>
	</body>
	</html>
	`;
}

async function handleHomepage(env: Env) {
	const { results } = await env.vibecoding_db.prepare('SELECT username, display_name FROM users ORDER BY created_at DESC').all();
	const userList = results.map((u: any) => `<li>${u.display_name || u.username} <a href="/user/${u.username}" class="btn btn-secondary">View Profile</a></li>`).join('');
	return new Response(layout('VibeCoding', `
		<h1>VibeCoding Community</h1>
		<div class="card">
			<p>Create your profile or build an AI Agent that can call your APIs.</p>
			<a href="/user/new" class="btn">Create Profile</a>
			<a href="/agent/new" class="btn btn-secondary">Create AI Agent</a>
		</div>
		<h2>Users</h2>
		<ul>${userList || '<li>No users yet.</li>'}</ul>
	`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleLoginPage() {
	return new Response(layout('Login', `
		<h1>Login</h1>
		<form action="/api/login" method="POST" class="card">
			<label>Username: <input name="username" required></label>
			<label>Password: <input name="password" type="password" required></label>
			<button type="submit" class="btn">Login</button>
			<p style="margin-top:15px;">No account? <a href="/user/new">Register here</a></p>
		</form>
	`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleLogin(request: Request, env: Env) {
	const formData = await request.formData();
	const username = formData.get('username') as string;
	const password = formData.get('password') as string;
	const user = await env.vibecoding_db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
	if (!user || user.password !== password) return new Response('Invalid credentials', { status: 401 });
	const token = generateToken({ username: user.username, role: user.role }, env.JWT_SECRET);
	return new Response(null, {
		status: 302,
		headers: { 'Location': '/', 'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Max-Age=86400` }
	});
}

function handleLogout() {
	return new Response(null, {
		status: 302,
		headers: { 'Location': '/', 'Set-Cookie': 'auth_token=; Path=/; Max-Age=0' }
	});
}

async function handleRegister(request: Request, env: Env) {
	const formData = await request.formData();
	const username = formData.get('username') as string;
	const password = formData.get('password') as string;
	await env.vibecoding_db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').bind(username, password).run();
	return new Response(null, { status: 302, headers: { 'Location': new URL('/login', request.url).toString() } });
}

async function handleAdminPage(env: Env) {
	const { results: users } = await env.vibecoding_db.prepare('SELECT id, username, role FROM users').all();
	const userList = users.map((u: any) => `<li>${u.username} (${u.role})</li>`).join('');
	return new Response(layout('Admin', `<h1>Admin</h1><ul>${userList}</ul>`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleCreateUserPage() {
	return new Response(layout('New User', `
		<h1>Create Profile</h1>
		<form action="/api/register-user" method="POST" class="card">
			<label>Username: <input name="username" required></label>
			<label>Password: <input name="password" type="password" required></label>
			<label>Display Name: <input name="display_name"></label>
			<label>Bio: <textarea name="bio"></textarea></label>
			<label>Website: <input name="website" type="url"></label>
			<button type="submit" class="btn">Register & Save Profile</button>
		</form>
	`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleRegisterUser(request: Request, env: Env) {
	const formData = await request.formData();
	const username = formData.get('username') as string;
	const password = formData.get('password') as string;
	const display_name = formData.get('display_name') as string;
	const bio = formData.get('bio') as string;
	const website = formData.get('website') as string;
	if (!username || !password) return new Response('Username and Password required', { status: 400 });
	try {
		await env.vibecoding_db.prepare('INSERT INTO users (username, password, display_name, bio, website) VALUES (?, ?, ?, ?, ?)').bind(username, password, display_name, bio, website).run();
		return new Response(null, { status: 302, headers: { 'Location': new URL('/login', request.url).toString() } });
	} catch (e: any) {
		return new Response('Username already exists', { status: 400 });
	}
}

async function handleUserUpdate(request: Request, env: Env) {
	const formData = await request.formData();
	const username = formData.get('username') as string;
	const display_name = formData.get('display_name') as string;
	const bio = formData.get('bio') as string;
	const website = formData.get('website') as string;
	await env.vibecoding_db.prepare('UPDATE users SET display_name = ?, bio = ?, website = ? WHERE username = ?').bind(display_name, bio, website, username).run();
	return new Response(null, { status: 303, headers: { 'Location': new URL(`/user/${username}`, request.url).toString() } });
}

async function handleUserProfile(username: string, env: Env) {
	const user = await env.vibecoding_db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
	if (!user) return new Response('User not found', { status: 404 });
	return new Response(layout(`Profile: ${user.username}`, `<h1>${user.display_name || user.username}</h1><div class="card"><p>@${user.username}</p><p>${user.bio || ''}</p></div>`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleCreateAgentPage(env: Env) {
	return new Response(layout('New Agent', `
		<h1>Create Agent</h1>
		<form action="/api/agent" method="POST" class="card">
			<label>Name: <input name="name" required></label>
			<label>Model: <input name="model" value="meta-llama/llama-3-8b-instruct"></label>
			<label>Prompt: <textarea name="system_prompt"></textarea></label>
			<button type="submit" class="btn">Create</button>
		</form>
	`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleAgentUpdate(request: Request, env: Env) {
	const formData = await request.formData();
	const name = formData.get('name') as string;
	const model = formData.get('model') as string;
	const prompt = formData.get('system_prompt') as string;
	const result = await env.vibecoding_db.prepare('INSERT INTO agents (name, model, system_prompt) VALUES (?, ?, ?)').bind(name, model, prompt).run();
	const lastRowId = result.meta.last_row_id;
	return new Response(null, { status: 303, headers: { 'Location': new URL(`/agent/${lastRowId}`, request.url).toString() } });
}

async function handleAgentPage(agentId: string, env: Env) {
	const agent = await env.vibecoding_db.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first();
	if (!agent) return new Response('Not found', { status: 404 });
	const specs = await env.vibecoding_db.prepare('SELECT * FROM agent_specs WHERE agent_id = ?').bind(agentId).all();
	return new Response(layout(`Agent: ${agent.name}`, `
		<h1>Agent: ${agent.name}</h1>
		<div class="card"><p>Model: ${agent.model}</p></div>
		<div class="chat-container">
			<div class="chat-messages" id="chat-box"></div>
			<div class="chat-input">
				<input id="user-input" placeholder="Message...">
				<button id="send-btn" class="btn">Send</button>
			</div>
		</div>
		<script>
			const agentId = "${agentId}";
			const chatBox = document.getElementById('chat-box');
			async function append(role, text) {
				const msg = document.createElement('div');
				msg.className = role === 'user' ? 'user-msg message' : role === 'tool' ? 'tool-msg message' : 'ai-msg message';
				msg.textContent = text;
				chatBox.appendChild(msg);
				chatBox.scrollTop = chatBox.scrollHeight;
			}
			document.getElementById('send-btn').onclick = async () => {
				const input = document.getElementById('user-input');
				const text = input.value; if(!text) return;
				input.value = ''; append('user', text);
				const resp = await fetch('/agent/' + agentId, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: text })
				});
				const data = await resp.json();
				if (data.steps) {
					for (const step of data.steps) {
						if (step.role === 'tool') append('tool', step.content);
						else append('ai', step.content);
					}
				} else {
					append('ai', data.response);
				}
			};
		</script>
	`), { headers: { 'Content-Type': 'text/html' } });
}

async function handleAgentChat(request: Request, agentId: string, env: Env) {
	const { message } = await request.json();
	const agent = await env.vibecoding_db.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first();
	if (!agent) return new Response('Agent not found', { status: 404 });
	const specs = await env.vibecoding_db.prepare('SELECT * FROM agent_specs WHERE agent_id = ?').bind(agentId).all();
	let systemPrompt = agent.system_prompt || "You are a helpful assistant.";
	if (specs.results.length > 0) {
		const allSpecs = specs.results.map((s: any) => `Tool: ${s.name}\\nSpec: ${s.spec_json}`).join('\\n\\n');
		systemPrompt += `
\\n\\n### Available Tools
You can call external APIs using the following OpenAPI specifications:
${allSpecs}

### Tool Call Format
If you need to use a tool, you MUST respond with a JSON object and nothing else:
{
  "tool_call": "TOOL_NAME",
  "params": { "param1": "value1", ... }
}

### Reasoning Loop
1. **Thought**: Analyze the user request and decide which tool to use.
2. **Action**: Issue the JSON tool call.
3. **Observation**: You will receive the API response.
4. **Repeat**: Use the observation to decide the next step or provide the final answer.

If the tool returns an error, analyze the error and try to correct your parameters in the next turn.`;
	}
	const steps = [];
	let currentMessage = message;
	let turnCount = 0;
	const maxTurns = 5;
	while (turnCount < maxTurns) {
		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
				"HTTP-Referer": "https://vibecoding-worker.yuan88yuan-tw.workers.dev",
				"X-Title": "VibeCoding Agent",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: agent.model || "meta-llama/llama-3-8b-instruct", 
				messages: [
					{ role: 'system', content: systemPrompt },
					...steps.map(s => ({ role: s.role === 'tool' ? 'user' : 'assistant', content: s.content })),
					{ role: 'user', content: currentMessage }
				]
			})
		});
		
		const data = await response.json();
		if (!data.choices || data.choices.length === 0) {
			throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
		}
		const aiText = data.choices[0].message.content;
		if (!aiText) {
			throw new Error("AI returned an empty message content");
		}
		try {
			const toolCall = JSON.parse(aiText);
			if (toolCall && toolCall.tool_call) {
				const toolName = toolCall.tool_call;
				const params = toolCall.params || {};
				steps.push({ role: 'ai', content: `Calling tool: ${toolName}...` });
				const spec = specs.results.find((s: any) => s.name === toolName);
				if (!spec) {
					currentMessage = `Error: Tool ${toolName} not found in specs.`;
				} else {
					const observation = await executeToolCall(spec.spec_json, params);
					steps.push({ role: 'tool', content: `[API Response from ${toolName}]: ${observation}` });
					currentMessage = `Observation: ${observation}`;
				}
				turnCount++;
				continue;
			}
		} catch (e) {}
		steps.push({ role: 'ai', content: aiText });
		break;
	}
	return new Response(JSON.stringify({ steps }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleAddSpec(request: Request, env: Env) {
	const { agentId, name, spec } = await request.json();
	await env.vibecoding_db.prepare('INSERT INTO agent_specs (agent_id, name, spec_json) VALUES (?, ?, ?)').bind(agentId, name, spec).run();
	return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleRemoveSpec(request: Request, env: Env) {
	const { specId } = await request.json();
	await env.vibecoding_db.prepare('DELETE FROM agent_specs WHERE id = ?').bind(specId).run();
	return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}
