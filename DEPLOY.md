# Deployment Guide — Oracle Cloud Always Free + TiDB Serverless

## Prerequisites

- An Oracle Cloud account (free tier, ARM Ampere A1 instances are always-free)
- A TiDB Serverless cluster (tidbcloud.com, free tier)
- Your repo pushed to GitHub (or another Git host)

---

## 1. Create a TiDB Serverless cluster

1. Sign up at https://tidbcloud.com
2. Create a **Serverless** cluster (free tier)
3. From the cluster's **Connect** page, note down:
   - `HOST`
   - `PORT` (usually `4000`)
   - `USER`
   - `PASSWORD`
   - `DATABASE` (default is usually `test`, create a new one if you prefer)

---

## 2. Create an Oracle Cloud VM

1. Sign in to Oracle Cloud → **Compute → Instances → Create Instance**
2. **Shape:** Click *Change shape* → **Ampere** → `VM.Standard.A1.Flex`
   - **1 OCPU, 4 GB RAM minimum** (the always-free pool allows up to 4 OCPU / 24 GB total, so this is still free)
   - Do not leave RAM at the default 1 GB — it is too low and will cause the instance to freeze during package installs
3. **Image:** Oracle Linux 9 (default — do not change to Ubuntu, as `opc` is the correct user for Oracle Linux)
4. **SSH keys:** Generate or upload your public key — you'll need this to connect
5. Leave everything else as default and click **Create**

---

## 3. Open the firewall — two layers required

Oracle Cloud blocks traffic at two levels. **Both** must be configured.

### Layer 1: VCN Security List (Oracle's firewall)

1. Go to your instance → **Subnet** → **Default Security List**
2. Add an **Ingress Rule**:
   - Source CIDR: `0.0.0.0/0`
   - Protocol: TCP
   - Destination port: `3000`

### Layer 2: Instance OS firewall (firewalld)

SSH into your VM (see step 4 first), then run:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 4. SSH into the VM

```bash
ssh -i /path/to/your-key.key opc@<your-instance-public-ip>
```

---

## 5. Install Node.js 24

Use `nvm` to install Node.js in userspace — this avoids triggering system-level package downloads (like ksplice) that can overwhelm low-memory instances.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
node -v  # should print v24.x.x
```

---

## 6. Install pm2

```bash
sudo npm install -g pm2
```

---

## 7. Deploy the app

```bash
git clone <your-repo-url> salt-mines
cd salt-mines
npm ci --omit=dev
```

Create the `.env` file:

```bash
cp .env.example .env
nano .env
```

Fill in the values:

```
NODE_ENV=production
PORT=3000

DATABASE_USER=<tidb-user>
DATABASE_PASSWORD=<tidb-password>
DATABASE_HOST=<tidb-host>
DATABASE_PORT=4000
DATABASE_NAME=<tidb-database>

SALTY_BET_API_URL=<your-url>
```

---

## 8. Run database migrations

```bash
npx sequelize-cli db:migrate
```

---

## 9. Start the app with pm2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 logs salt-mines  # verify it started cleanly
```

---

## 10. Persist pm2 across reboots

```bash
pm2 save
pm2 startup
# Copy and run the command it prints (it will look like: sudo env PATH=... pm2 startup ...)
```

---

## Updating the app

```bash
cd ~/salt-mines
git pull
npm ci --omit=dev
pm2 restart salt-mines
```

If there are new migrations:

```bash
npx sequelize-cli db:migrate
pm2 restart salt-mines
```

---

## Useful pm2 commands

| Command | Description |
|---|---|
| `pm2 status` | Show running apps |
| `pm2 logs salt-mines` | Tail logs |
| `pm2 restart salt-mines` | Restart the app |
| `pm2 stop salt-mines` | Stop the app |
| `pm2 monit` | Live CPU/memory dashboard |
