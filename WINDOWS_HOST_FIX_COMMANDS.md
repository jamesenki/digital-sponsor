# 🔧 Windows Host Commands to Fix WSL2 Network Access

## 🎯 **Problem:** WSL2 network isolation preventing external access to Digital Sponsor demo

## ✅ **Solution: Windows PowerShell Commands (Run as Administrator)**

### **Step 1: Open PowerShell as Administrator**
- Right-click Start button
- Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

### **Step 2: Get Your Windows Host IP Address**
```powershell
# Find your Windows host IP address
ipconfig

# Look for the main network adapter (usually "Ethernet" or "Wi-Fi")
# Note the IPv4 Address (e.g., 192.168.1.100)
```

### **Step 3: Set Up Port Forwarding from Windows Host to WSL2**
```powershell
# Replace 172.22.234.178 with your actual WSL2 IP if different
# This forwards port 80 from Windows host to WSL2
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.22.234.178

# Verify the rule was created
netsh interface portproxy show v4tov4
```

### **Step 4: Configure Windows Firewall**
```powershell
# Allow incoming traffic on port 80
New-NetFirewallRule -DisplayName "WSL2 Digital Sponsor Demo" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Alternative method if above doesn't work:
netsh advfirewall firewall add rule name="WSL2 Digital Sponsor" dir=in action=allow protocol=TCP localport=80
```

### **Step 5: Update Your NoIP Configuration**
1. **Log into your NoIP account** at no-ip.com
2. **Edit noos.zapto.org hostname**
3. **Change the IP address** from `68.43.96.51` to your **Windows host IP** (from Step 2)
4. **Save the changes**

### **Step 6: Test the Connection**
```powershell
# Test local access first
curl http://localhost

# Test via Windows host IP
curl http://[YOUR-WINDOWS-HOST-IP]
```

## 🔍 **Troubleshooting Commands**

### **If Port 80 is Already in Use on Windows:**
```powershell
# Check what's using port 80
netstat -ano | findstr :80

# If IIS or another service is using port 80, use port 8080 instead:
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=80 connectaddress=172.22.234.178

# Then access via: http://noos.zapto.org:8080
```

### **Check Current Port Forwarding Rules:**
```powershell
# View all current port proxy rules
netsh interface portproxy show v4tov4

# Remove a rule if needed
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0
```

### **Verify Windows Firewall Rules:**
```powershell
# Show firewall rules
netsh advfirewall firewall show rule name="WSL2 Digital Sponsor"

# Remove rule if needed
netsh advfirewall firewall delete rule name="WSL2 Digital Sponsor"
```

## 🚀 **Alternative: Use Different Port**

### **If Port 80 Conflicts, Use Port 3000:**
```powershell
# Set up port forwarding for port 3000
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.22.234.178

# Allow through firewall
New-NetFirewallRule -DisplayName "WSL2 Digital Sponsor 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Then start React dev server in WSL2:
# HOST=0.0.0.0 npm start
# Access via: http://noos.zapto.org:3000
```

## 📋 **Complete Step-by-Step Process**

### **On Windows Host (PowerShell as Admin):**
1. `ipconfig` → Note your Windows host IP
2. `netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.22.234.178`
3. `New-NetFirewallRule -DisplayName "WSL2 Digital Sponsor Demo" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow`
4. Update noos.zapto.org to point to Windows host IP

### **Test Access:**
- From Windows host: `http://localhost`
- From Windows host IP: `http://[WINDOWS-HOST-IP]`
- From external system: `http://noos.zapto.org`

## 🎯 **Expected Result**

After running these commands:
- ✅ **noos.zapto.org** will resolve to your Windows host
- ✅ **Traffic will forward** from Windows host to WSL2
- ✅ **Digital Sponsor demo** will be accessible from any device
- ✅ **Professional domain access** for investor presentations

## ⚡ **Quick Summary Commands**

**Run these 3 commands in PowerShell as Administrator:**
```powershell
# 1. Set up port forwarding
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.22.234.178

# 2. Allow through firewall  
New-NetFirewallRule -DisplayName "WSL2 Digital Sponsor Demo" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# 3. Check your Windows IP for NoIP update
ipconfig
```

**Then update noos.zapto.org to point to your Windows host IP instead of 68.43.96.51**

---

## 🚨 **Important Notes**

1. **Run PowerShell as Administrator** - Required for network configuration
2. **Note your Windows host IP** - Needed for NoIP configuration update
3. **Update NoIP settings** - Change from 68.43.96.51 to Windows host IP
4. **Docker container must be running** - Ensure Digital Sponsor is still running in WSL2
5. **Test locally first** - Verify forwarding works before external testing

This should resolve the network isolation and make your Digital Sponsor demo accessible via noos.zapto.org! 🎯