#socket programming
# single threaded scanner 
import socket
import sys
from datetime import datetime

# 1. Target Define Karna (Abhi ke liye Google ya Localhost lele)
target_ip = "8.8.8.8"  # Google DNS ka IP (Test ke liye safe hai)
# Ya tu "127.0.0.1" use kar sakta hai khud ke laptop ko scan karne ke liye

# 2. Scan Shuru hone ka Time note karna
print("-" * 50)
print(f"Scanning Target: {target_ip}")
print(f"Time started: {str(datetime.now())}")
print("-" * 50)

try:
    # 3. Loop: Hum port 20 se 85 tak scan karenge (Common ports like 21, 22, 80)
    for port in range(20, 85): 
        
        # [Step A] Socket Object Banana
        # AF_INET = IPv4, SOCK_STREAM = TCP
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        
        # [Step B] Timeout Set Karna
        # Agar 0.5 second tak darwaza nahi khula, toh aage badho.
        # Yeh bohot zaroori hai, warna code "hang" ho jayega closed ports pe.
        s.settimeout(0.5) 
        
        # [Step C] Connection Try Karna (The Bell Ring)
        # connect_ex() return karta hai:
        # 0 -> Success (Port Open)
        # Error Code -> Failure (Port Closed/Filtered)
        result = s.connect_ex((target_ip, port))
        
        # [Step D] Result Check Karna
        if result == 0:
            print(f"[+] Port {port} is OPEN")
            
            # [Bonus Goal] Service Identification (Banner Grabbing) try karna
            try:
                # Agar port open hai, toh server shayad apna naam bataye (e.g., SSH-2.0)
                # Hum 1024 bytes data receive karne ki koshish karte hain
                s.send(b'Hello\r\n') # Kabhi kabhi kuch bhejna padta hai response paane ke liye
                banner = s.recv(1024).decode().strip()
                print(f"    Service: {banner}")
            except:
                print("    Service: Unknown (Could not grab banner)")
        else:
            # Optional: Closed ports ko print mat kar warna screen bhar jayegi
            pass
            
        # [Step E] Socket Close Karna (Clean up)
        # Connection khatam karna zaroori hai taaki resources free hon
        s.close()

except KeyboardInterrupt:
    print("\n\n[!] User ne scan beech mein rok diya (Ctrl+C).")
    sys.exit()

except socket.gaierror:
    print("\n[!] Hostname resolve nahi ho paya. IP sahi daalo.")
    sys.exit()

except socket.error:
    print("\n[!] Server se connect nahi ho pa raha.")
    sys.exit()

# 4. Scan Khatam
print("-" * 50)
print(f"Scan completed at: {str(datetime.now())}")

