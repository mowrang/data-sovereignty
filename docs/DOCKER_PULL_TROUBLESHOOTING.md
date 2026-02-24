# Docker Pull Troubleshooting Guide

## Issue: `docker pull postgres:15` hangs

### Quick Fixes

1. **Check Docker Desktop is Running**
   ```bash
   # On macOS, check if Docker Desktop is running
   open -a Docker
   # Wait for Docker Desktop to fully start (whale icon in menu bar should be steady)
   ```

2. **Restart Docker Desktop**
   - Quit Docker Desktop completely
   - Restart it and wait for it to fully initialize
   - Try the pull again

3. **Check Docker Daemon Status**
   ```bash
   docker info
   # Should show server information, not errors
   ```

### Network Issues

4. **Try Pulling with Verbose Output**
   ```bash
   docker pull postgres:15 --platform linux/amd64
   # or
   docker pull postgres:15 --platform linux/arm64
   ```

5. **Check DNS Resolution**
   ```bash
   nslookup registry-1.docker.io
   # Should resolve to an IP address
   ```

6. **Try Alternative Registry Mirror** (if you have one configured)
   ```bash
   # Check Docker Desktop settings > Docker Engine
   # Look for registry-mirrors configuration
   ```

### Docker Configuration

7. **Reset Docker Desktop**
   - Docker Desktop > Settings > Troubleshoot > Reset to factory defaults
   - ⚠️ **Warning**: This will remove all containers, images, and volumes

8. **Check Docker Desktop Resources**
   - Docker Desktop > Settings > Resources
   - Ensure enough memory/CPU allocated
   - Try increasing if low

### Alternative Solutions

9. **Use Docker Compose Instead**
   ```bash
   # Docker Compose will pull images automatically
   docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev
   ```

10. **Pull Images Individually with Timeout**
    ```bash
    # Set a timeout
    timeout 60 docker pull postgres:15 || echo "Pull timed out"
    ```

11. **Use Pre-built Images from Alternative Sources**
    ```bash
    # Try pulling from GitHub Container Registry (if available)
    docker pull ghcr.io/postgres/postgres:15
    ```

### Platform-Specific Issues

12. **macOS ARM64 (Apple Silicon)**
    ```bash
    # Explicitly specify platform
    docker pull --platform linux/amd64 postgres:15
    # or for native ARM64
    docker pull --platform linux/arm64 postgres:15
    ```

13. **Check Docker Desktop Logs**
    - Docker Desktop > Troubleshoot > View logs
    - Look for network or registry errors

### Workaround: Skip Pull and Use Docker Compose

If pulls continue to hang, you can let Docker Compose handle it:

```bash
# Docker Compose will pull images as needed
cd /Users/maryam/Documents/005\ Engineering/JobHunting2026/social-media-agent
docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev

# Or start everything
npm run dev:up
```

Docker Compose may handle network issues better than direct `docker pull`.

### Check for Proxy/Firewall Issues

14. **If Behind Corporate Firewall/Proxy**
    - Docker Desktop > Settings > Resources > Proxies
    - Configure HTTP/HTTPS proxy if needed
    - Add registry-1.docker.io to no-proxy list if needed

15. **Check VPN**
    - Try disconnecting VPN temporarily
    - Some VPNs interfere with Docker registry access

### Verify Image Availability

16. **Check Image Exists**
    - Visit: https://hub.docker.com/_/postgres/tags
    - Verify `postgres:15` tag exists
    - Try pulling a different tag: `docker pull postgres:15-alpine`

### Most Common Solutions

**Solution 1: Restart Docker Desktop** (fixes 70% of cases)
```bash
# Quit Docker Desktop completely, then restart
```

**Solution 2: Use Docker Compose** (often more reliable)
```bash
docker compose -f docker-compose.dev.yml pull
# or
npm run dev:up
```

**Solution 3: Pull with Platform Flag**
```bash
docker pull --platform linux/amd64 postgres:15
docker pull --platform linux/amd64 redis:7-alpine
```

### Still Hanging?

If none of these work, the issue might be:
- Network infrastructure problem (ISP, firewall)
- Docker Desktop bug (try updating)
- System resource exhaustion

Try:
```bash
# Check system resources
top
# Look for high CPU/memory usage

# Check Docker Desktop version
docker version
# Consider updating Docker Desktop
```
