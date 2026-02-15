# Deploy backend on GCP VM (api.mypeach.in)

No Docker. Run with PM2; use nginx for HTTPS and custom domain. Update by `git pull` + `pm2 restart`.

---

## 1. GCP: Create the VM

1. **Compute Engine** → **VM instances** → **Create instance**.
2. **Name:** e.g. `wellness-api`.
3. **Region:** Pick one close to your users.
4. **Machine type:** e2-small or e2-micro (enough for a Node API).
5. **Boot disk:** Ubuntu 22.04 LTS, 10–20 GB.
6. **Firewall:** Enable **Allow HTTP traffic** and **Allow HTTPS traffic** (for nginx + certbot).
7. Create. Note the **External IP** (e.g. `34.x.x.x`).

---

## 2. DNS: Point domain to the VM

At your domain registrar (where mypeach.in is managed):

- **Type:** A  
- **Name:** `api` (or `api.mypeach.in` if the registrar uses FQDN)  
- **Value:** the VM’s **External IP**  
- TTL: 300–600

Wait until `api.mypeach.in` resolves to that IP (`dig api.mypeach.in` or use an online DNS checker).

---

## 3. SSH into the VM and one-time setup

```bash
ssh YOUR_USER@EXTERNAL_IP
# Or: gcloud compute ssh wellness-api --zone=YOUR_ZONE
```

Then run (copy-paste in order):

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git, nginx, certbot
sudo apt-get update
sudo apt-get install -y git nginx certbot python3-certbot-nginx

# App directory (use your real repo URL)
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/YOUR_ORG/wellness-platform.git
cd wellness-platform/backend

# Dependencies and build
npm ci
npm run build

# Env and secrets (create .env and optionally secrets/ on the server)
nano .env
# Paste your production .env (PORT=4000, MONGODB_URI, JWT_SECRET, GCS_BUCKET, etc.)
# On GCP VM you can leave GOOGLE_APPLICATION_CREDENTIALS unset and use the VM’s service account for GCS.
# If you use a key file: mkdir -p secrets && nano secrets/wellness-backend-key.json
```

**.env on server (minimal):**

```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-strong-production-secret
GCS_BUCKET=wellness-assets
# GOOGLE_APPLICATION_CREDENTIALS=./secrets/wellness-backend-key.json   # only if using a key file
# VENICE_API_KEY=...
# OPENAI_API_KEY=...
# CORS_ORIGIN=https://mypeach.in,https://www.mypeach.in
```

---

## 4. PM2: run the app

```bash
cd /var/www/wellness-platform/backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Run the command that pm2 startup prints (sudo env PATH=...)
```

Check: `pm2 status` and `pm2 logs wellness-api`.

---

## 5. Nginx: reverse proxy + SSL (api.mypeach.in)

Create the site config:

```bash
sudo nano /etc/nginx/sites-available/wellness-api
```

Paste (replace `api.mypeach.in` if different):

```nginx
server {
    listen 80;
    server_name api.mypeach.in;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and get HTTPS:

```bash
sudo ln -s /etc/nginx/sites-available/wellness-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL (Let’s Encrypt). DNS for api.mypeach.in must already point to this VM.
sudo certbot --nginx -d api.mypeach.in
```

Follow certbot prompts. It will adjust the nginx config for HTTPS and renewal.

---

## 6. GCP: service account for the VM (for GCS)

If you want the VM to use a service account (no key file):

1. **Compute Engine** → your VM → **Edit** → **Service account**: pick or create one (e.g. `wellness-api@PROJECT.iam.gserviceaccount.com`).
2. In **Cloud Storage** → bucket **wellness-assets** → **Permissions**: grant that service account **Storage Object Creator** (and **Storage Object Viewer** if you need reads).
3. On the VM, leave `GOOGLE_APPLICATION_CREDENTIALS` unset in `.env`.

---

## 7. Updates (pull and restart)

```bash
cd /var/www/wellness-platform
git pull
cd backend
npm ci
npm run build
pm2 restart wellness-api
```

Optional one-liner:

```bash
cd /var/www/wellness-platform && git pull && cd backend && npm ci && npm run build && pm2 restart wellness-api
```

---

## Checklist

| Step | Done |
|------|------|
| VM created, HTTP/HTTPS allowed | |
| DNS A record api.mypeach.in → VM IP | |
| Node, git, nginx, certbot installed | |
| Repo cloned, `npm ci` + `npm run build` | |
| `.env` (and secrets if needed) on server | |
| PM2 running, `pm2 save` + `pm2 startup` | |
| Nginx proxy to port 4000 | |
| Certbot SSL for api.mypeach.in | |
| VM service account has GCS access (or key file in secrets/) | |

After that, your API is at **https://api.mypeach.in** (e.g. `https://api.mypeach.in/health`).
