export interface Env {
	vibecoding_db: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Simple Router
		if (path === '/' || path === '/index') {
			return handleHomepage(env);
		}

		if (path.startsWith('/user/')) {
			const username = path.split('/')[2];
			if (request.method === 'GET') {
				return handleUserProfile(username, env);
			}
			return new Response('Method Not Allowed', { status: 405 });
		}

		if (path === '/api/user' && request.method === 'POST') {
			return handleUserUpdate(request, env);
		}

		return new Response('Not Found', { status: 404 });
	},
};

async function handleHomepage(env: Env) {
	const { results } = await env.vibecoding_db.prepare('SELECT username, display_name FROM users ORDER BY created_at DESC').all();
	
	const userListHtml = results.map((user: any) => 
		`<li><a href="/user/${user.username}">${user.display_name || user.username}</a></li>`
	).join('');

	const html = `
	<!DOCTYPE html>
	<html>
	<head>
		<title>VibeCoding Community</title>
		<style>
			body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
			h1 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
			ul { list-style: none; padding: 0; }
			li { margin: 10px 0; }
			a { color: #0366d6; text-decoration: none; }
			a:hover { text-decoration: underline; }
			.card { border: 1px solid #ddd; padding: 20px; border-radius: 6px; background: #f6f8fa; }
			.btn { background: #2ea44f; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; display: inline-block; border: none; cursor: pointer; }
		</style>
	</head>
	<body>
		<h1>VibeCoding Profiles</h1>
		<div class="card">
			<p>Welcome to the community! Find a user or create your own profile.</p>
			<a href="/user/new" class="btn">Create Your Profile</a>
		</div>
		<h2>Users</h2>
		<ul>${userListHtml || '<li>No users yet. Be the first!</li>'}</ul>
	</body>
	</html>
	`;
	return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

async function handleUserProfile(username: string, env: Env) {
	if (username === 'new') {
		return new Response(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Create Profile</title>
				<style>
					body { font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 0 20px; }
					form { display: flex; flex-direction: column; gap: 15px; }
					input, textarea { padding: 8px; font-size: 1rem; }
					.btn { background: #2ea44f; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; }
				</style>
			</head>
			<body>
				<h1>Create/Update Profile</h1>
				<form action="/api/user" method="POST">
					<label>Username (Unique ID): <input name="username" required></label>
					<label>Display Name: <input name="display_name"></label>
					<label>Bio: <textarea name="bio"></textarea></label>
					<label>Website: <input name="website" type="url"></label>
					<button type="submit" class="btn">Save Profile</button>
				</form>
			</body>
			</html>
		`, { headers: { 'Content-Type': 'text/html' } });
	}

	const user = await env.vibecoding_db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();

	if (!user) {
		return new Response('User not found', { status: 404 });
	}

	const html = `
	<!DOCTYPE html>
	<html>
	<head>
		<title>${user.display_name || user.username} - VibeCoding</title>
		<style>
			body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
			.profile-header { display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #eaecef; padding-bottom: 20px; margin-bottom: 20px; }
			.avatar { width: 100px; height: 100px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; }
			.info h1 { margin: 0; }
			.bio { font-size: 1.1rem; color: #555; }
			.link { color: #0366d6; text-decoration: none; }
			.back { margin-bottom: 20px; display: block; }
		</style>
	</head>
	<body>
		<a href="/" class="back">&larr; Back to Home</a>
		<div class="profile-header">
			<div class="avatar">${(user.username[0] || 'U').toUpperCase()}</div>
			<div class="info">
				<h1>${user.display_name || user.username}</h1>
				<p>@${user.username}</p>
			</div>
		</div>
		<div class="bio">
			<p>${user.bio || 'No bio provided.'}</p>
			${user.website ? `<p>🌐 <a class="link" href="${user.website}">${user.website}</a></p>` : ''}
		</div>
	</body>
	</html>
	`;
	return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

async function handleUserUpdate(request: Request, env: Env) {
	const formData = await request.formData();
	const username = formData.get('username') as string;
	const display_name = formData.get('display_name') as string;
	const bio = formData.get('bio') as string;
	const website = formData.get('website') as string;

	if (!username) {
		return new Response('Username is required', { status: 400 });
	}

	try {
		await env.vibecoding_db.prepare(
			'INSERT INTO users (username, display_name, bio, website) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET display_name=excluded.display_name, bio=excluded.bio, website=excluded.website'
		).bind(username, display_name, bio, website).run();

		return Response.redirect(`/user/${username}`, 303);
	} catch (e: any) {
		return new Response(`Error saving user: ${e.message}`, { status: 500 });
	}
}
