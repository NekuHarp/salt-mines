# Deployment Guide — Oracle Cloud Always Free + TiDB Serverless

## Prerequisites

- An Oracle Cloud account (free tier)
- A TiDB Serverless cluster (tidbcloud.com, free tier)
- Your SSH private key from instance creation copied into `~/.ssh/` with `chmod 600`

---

## 1. Create a TiDB Serverless cluster

1. Sign up at https://tidbcloud.com
2. Create a **Serverless** cluster (free tier)
3. From the cluster's **Connect** page, note down:
   - `HOST`
   - `PORT` (usually `4000`)
   - `USER`
   - `PASSWORD`
   - `DATABASE` (default is `test`, create a new one if you prefer)

---

## 2. Create an Oracle Cloud VM

1. Sign in to Oracle Cloud → **Compute → Instances → Create Instance**
2. **Shape:** Click *Change shape* → **Specialty and previous generation** → `VM.Standard.E2.1.Micro`
   - RAM is fixed at 1 GB — swap will compensate for this (see step 5)
   - Note: A1.Flex ARM instances have more RAM and are also always-free, but are frequently out of capacity
3. **Image:** Oracle Linux 9 (default — do not change)
4. **SSH keys:** Upload your public key — you'll need the corresponding private key to connect
5. Leave everything else as default and click **Create**

---

## 3. Assign a public IP

1. Go to your instance → **Attached VNICs** → click the VNIC name
2. Under **IPv4 Addresses** → click ⋮ next to the private IP → **Edit**
3. Set *Public IP address* to **Ephemeral public IP** and click **Update**

---

## 4. Open the firewall — two layers required

Oracle Cloud blocks traffic at two levels. **Both** must be configured.

### Layer 1: VCN Security List (Oracle's firewall)

1. Go to your instance → **Subnet** → **Default Security List**
2. Add an **Ingress Rule**:
   - Source CIDR: `0.0.0.0/0`
   - Protocol: TCP
   - Destination port: `3000`

### Layer 2: Instance OS firewall (firewalld)

SSH into your VM (see step 5 first), then run:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 5. SSH into the VM

```bash
ssh -i ~/.ssh/your-key.key opc@<your-instance-public-ip>
```

To avoid typing `-i` every time, add to `~/.ssh/config`:

```
Host oracle
    HostName <your-instance-public-ip>
    User opc
    IdentityFile ~/.ssh/your-key.key
```

Then you can just run `ssh oracle`.

---

## 6. Add swap — do this before anything else

The instance only has 1 GB RAM. Adding swap prevents it from freezing during installs.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

---

## 7. Disable SELinux enforcement

Oracle Linux has SELinux enforcing by default, which blocks systemd from executing
binaries in the home directory. Set it to permissive:

```bash
sudo setenforce 0
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

---

## 8. Install Node.js 24 via nvm

Use nvm instead of dnf — dnf pulls in heavy Oracle-specific packages (ksplice etc.)
that can freeze the instance.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
node -v  # should print v24.x.x
```

---

## 9. Install pm2

```bash
npm install -g pm2
```

---

## 10. Transfer the project files

Run this from your **local machine** (not the VM). This creates a tar archive
excluding node_modules and transfers it over scp:

```bash
cd /path/to/parent/of/salt-mines
tar -czf salt-mines.tar.gz \
  --exclude=salt-mines/node_modules \
  --exclude=salt-mines/.env \
  --exclude=salt-mines/.git \
  salt-mines
scp -i ~/.ssh/your-key.key salt-mines.tar.gz opc@<your-instance-ip>:~/
```

Then on the VM, extract and install dependencies:

```bash
tar -xzf salt-mines.tar.gz
cd salt-mines
NODE_OPTIONS=--max-old-space-size=400 npm ci --omit=dev
```

The `NODE_OPTIONS` flag caps Node's memory usage during install to prevent freezing.

---

## 11. Create the `.env` file

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

## 12. Run database migrations

```bash
npx sequelize-cli db:migrate
```

---

## 13. Start the app with pm2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 logs salt-mines  # verify it started cleanly
```

---

## 14. Set up auto-start on reboot via systemd

pm2's built-in `pm2 startup` does not work reliably with nvm on Oracle Linux.
Use a manual systemd service instead:

```bash
sudo nano /etc/systemd/system/salt-mines.service
```

Paste:

```ini
[Unit]
Description=salt-mines
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=opc
ExecStart=/bin/bash -c 'source /home/opc/.nvm/nvm.sh && pm2 start /home/opc/salt-mines/ecosystem.config.cjs --env production'
ExecStop=/bin/bash -c 'source /home/opc/.nvm/nvm.sh && pm2 kill'

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable salt-mines
sudo systemctl start salt-mines
```

Reboot to confirm it comes back up automatically:

```bash
sudo reboot
```

After rebooting, SSH back in and verify:

```bash
pm2 status
```

---

## Updating the app

From your **local machine**, retransfer the files:

```bash
cd /path/to/parent/of/salt-mines
tar -czf salt-mines.tar.gz \
  --exclude=salt-mines/node_modules \
  --exclude=salt-mines/.env \
  --exclude=salt-mines/.git \
  salt-mines
scp -i ~/.ssh/your-key.key salt-mines.tar.gz opc@<your-instance-ip>:~/
```

Then on the VM:

```bash
cd ~
tar -xzf salt-mines.tar.gz
cd salt-mines
NODE_OPTIONS=--max-old-space-size=400 npm ci --omit=dev
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
