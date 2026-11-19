import { PracticalLab } from '../../types';

export const TIER_1_LABS: PracticalLab[] = [
  // ==========================================
  // 1. COMPUTER FUNDAMENTALS
  // ==========================================
  {
    id: 'lab-comp-hardware',
    lessonId: 'comp-hardware',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Hardware Architecture & Memory Hierarchy Explorer',
    objective: 'Inspect how the motherboard, CPU registers, cache, RAM, and persistent storage work together—and identify which memory loses data on power loss.',
    shortExplanation: 'Every running program moves data from permanent storage into fast volatile memory so the CPU can process it. Select each component below to inspect its speed, volatility, and security role.',
    expectedOutcome: 'Explore at least 3 hardware components and correctly diagnose which memory layer retains data after a sudden power shutdown.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'motherboard',
        label: 'Motherboard',
        role: 'Central Circuit Board & Data Bus',
        summary: 'Connects the CPU, RAM, storage, and expansion slots through high-speed electrical buses and houses BIOS/UEFI firmware.',
        details: [
          'Routes power and data signals across PCIe, SATA, and memory channels',
          'Stores low-level UEFI/BIOS firmware on an onboard flash chip',
          'Includes hardware security modules such as TPM (Trusted Platform Module)'
        ],
        securityRelevance: 'Physical tampering or malicious firmware updates on the motherboard persist below the operating system.',
        sampleMetric: 'PCIe 4.0 / DMI Bus'
      },
      {
        id: 'cpu-registers',
        label: 'CPU Registers & Cache',
        role: 'Inside-Processor Scratchpad (Volatile)',
        summary: 'Ultra-fast SRAM memory built directly into the processor core to hold active instructions and operands.',
        details: [
          'Registers hold single instruction values (~bytes) at ~1 CPU cycle',
          'L1/L2/L3 caches store recently accessed instructions and data (KB to MB)',
          'Clears immediately when power drops or context switches occur'
        ],
        securityRelevance: 'Speculative execution side-channel vulnerabilities target shared CPU cache timing.',
        sampleMetric: '< 1–10 ns · Volatile'
      },
      {
        id: 'ram',
        label: 'System RAM (DRAM)',
        role: 'Active Program Memory (Volatile)',
        summary: 'High-speed main memory holding running applications, open files, decrypted secrets, and OS kernel state.',
        details: [
          'Measured in gigabytes (e.g., 16 GB or 32 GB DDR4/DDR5)',
          'Requires continuous electrical refresh; loses contents when powered off',
          'Monitored on Linux with `free -h`'
        ],
        securityRelevance: 'Incident responders capture RAM dumps (using tools like Volatility) before rebooting so in-memory malware and encryption keys are not lost.',
        sampleMetric: '~60 ns · Volatile'
      },
      {
        id: 'storage',
        label: 'SSD / NVMe / HDD Storage',
        role: 'Persistent Long-Term Storage (Non-Volatile)',
        summary: 'Solid-state NAND flash or magnetic disk drives that preserve the operating system, logs, and user files without power.',
        details: [
          'NVMe SSDs connect via PCIe lanes for multi-GB/s throughput',
          'Retains files, system logs, and partitions across shutdowns',
          'Inspected on Linux with `lsblk` and `df -hT`'
        ],
        securityRelevance: 'Unencrypted drives expose sensitive files if physically stolen; full-disk encryption (BitLocker / LUKS) protects data at rest.',
        sampleMetric: '~50 µs–10 ms · Non-Volatile'
      }
    ],
    challenge: {
      prompt: 'An analyst arrives at a lab workstation (`lab-ws-04`) that may have an active memory-only script running. Why should they capture a RAM image before unplugging the power cable?',
      options: [
        'Cutting system power automatically overwrites the NVMe SSD partition table.',
        'DRAM locks inside the motherboard CMOS battery upon abrupt shutdown.',
        'RAM is volatile memory, so cutting power erases active runtime data.',
        'Memory dumps only store permanent log files copied after system reboot.'
      ],
      correctIndex: 2,
      hint: 'Compare what happens to volatile memory (RAM) versus non-volatile storage (SSD/HDD) when electricity stops.',
      explanation: 'DRAM relies on continuous electrical refresh to hold bits. Cutting power clears RAM contents within seconds, destroying volatile forensic evidence such as running processes, network sockets, and unencrypted session keys.'
    }
  },
  {
    id: 'lab-boot-os',
    lessonId: 'boot-os',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'UEFI Secure Boot & Kernel Startup Sequence',
    objective: 'Trace the exact trust chain from power-on firmware through UEFI Secure Boot, bootloader verification, and OS kernel initialization.',
    shortExplanation: 'Each boot stage validates the next component before handing over control. Step through the boot sequence to see how modern systems block boot-level malware.',
    expectedOutcome: 'Review all 4 boot stages and identify which mechanism blocks an unsigned bootloader.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'step-1-power',
        label: '1. Power-On & Firmware Init',
        role: 'Motherboard Flash Firmware',
        summary: 'CPU initializes hardware and runs POST (Power-On Self-Test) to verify RAM, storage controllers, and keyboard/display interfaces.',
        details: [
          'Legacy BIOS reads raw Sector 0 (MBR) without cryptographic checks',
          'Modern UEFI reads structured GPT partitions and the EFI System Partition (ESP)',
          'Hardware configuration and boot order are checked'
        ],
        securityRelevance: 'Firmware passwords and signed UEFI updates prevent unauthorized changes to boot devices.',
        sampleMetric: 'Stage 1 · Hardware'
      },
      {
        id: 'step-2-secureboot',
        label: '2. Secure Boot Verification',
        role: 'Cryptographic Signature Check',
        summary: 'UEFI checks the digital signature of the OS bootloader against trusted public keys stored in firmware.',
        details: [
          'Trusted keys live in the UEFI Signature Database (db)',
          'Revoked/compromised keys live in the Forbidden Database (dbx)',
          'Halts execution immediately if the bootloader signature fails'
        ],
        securityRelevance: 'Stops bootkits and tampered OS loaders from executing before the operating system starts.',
        sampleMetric: 'Stage 2 · Trust Gate'
      },
      {
        id: 'step-3-kernel',
        label: '3. OS Kernel & Virtual Memory',
        role: 'Core Operating System',
        summary: 'The verified bootloader loads the OS kernel, initializes the Memory Management Unit (MMU) and Page Tables, and mounts the root filesystem.',
        details: [
          'Separates privileged Kernel Space from restricted User Space',
          'Maps virtual addresses of processes to physical DRAM pages',
          'Mounts filesystems such as ext4 (Linux) or NTFS (Windows)'
        ],
        securityRelevance: 'Process isolation ensures one compromised user app cannot directly read another process’s memory.',
        sampleMetric: 'Stage 3 · Kernel'
      },
      {
        id: 'step-4-userspace',
        label: '4. System Services & User Processes',
        role: 'Runtime Processes & Threads',
        summary: 'Init/systemd launches background services and user login shells, each running as isolated processes containing lightweight threads.',
        details: [
          'Processes maintain isolated virtual address spaces',
          'Threads inside a process share memory for concurrency',
          'Inspected with `htop`, `ps`, and `df -hT`'
        ],
        securityRelevance: 'Monitoring parent-child process trees helps defenders detect anomalous scripts spawned by normal apps.',
        sampleMetric: 'Stage 4 · User Space'
      }
    ],
    challenge: {
      prompt: 'During startup on a corporate laptop, an attacker replaces the legitimate OS bootloader with an unsigned custom loader. Which UEFI control stops it before the OS kernel loads?',
      options: [
        'UEFI Secure Boot signature checks against trusted firmware keys',
        'Virtual memory page table compression inside the OS swap partition',
        'Automatic NTFS file permission conversion down to legacy FAT32',
        'Multithreaded hardware scheduling across user-space CPU cores'
      ],
      correctIndex: 0,
      hint: 'Look at Stage 2 of the boot sequence—how does UEFI check whether a bootloader is authentic?',
      explanation: 'UEFI Secure Boot verifies cryptographic signatures on bootloaders and early drivers against the firmware Signature Database (db). Unsigned or revoked loaders are blocked before reaching the OS kernel.'
    }
  },
  {
    id: 'lab-virt-cloud-basics',
    lessonId: 'virt-cloud-basics',
    kind: 'scenario',
    title: 'Cloud Shared Responsibility & Service Model Audit',
    objective: 'Inspect a fictional startup cloud deployment configuration and identify who is responsible for patching the guest OS in an IaaS environment.',
    shortExplanation: 'Cloud security depends on understanding where the provider’s responsibility ends and the customer’s begins across IaaS, PaaS, and SaaS.',
    expectedOutcome: 'Inspect the deployment manifest and select the accurate security responsibility boundary.',
    xpReward: 75,
    artifactTitle: 'deployment-inventory.yaml (Fictional Lab Environment)',
    artifactLanguage: 'yaml',
    artifactHighlightLines: [4, 5, 6, 7],
    artifactContent: `environment: lab-production-web
cloud_model: IaaS (Virtual Machine Instances)
provider: ExampleCloud Compute
instance_01:
  os_image: ubuntu-22.04-lts
  kernel_patch_status: "180 days behind (CVE updates pending)"
  firewall_ports: [22, 443]
  notes: "Customer assumed cloud provider automatically patches VM OS"`,
    challenge: {
      prompt: 'The team deployed raw virtual machines (IaaS) and never patched the Linux OS inside `instance_01`, assuming the cloud provider handled it. Who is responsible for patching the guest OS in IaaS?',
      options: [
        'The cloud provider automatically patches all customer VM operating systems and packages.',
        'The Type 1 hypervisor hardware vendor directly patches guest application dependencies.',
        'No operating system patching is required because IaaS runs inside a public datacenter.',
        'The customer organization manages guest OS patches, firewall rules, and deployed apps.'
      ],
      correctIndex: 3,
      hint: 'In IaaS, the provider secures the physical hardware and hypervisor—who manages everything installed inside the virtual machine?',
      explanation: 'Under the Shared Responsibility Model for IaaS, the cloud provider secures physical datacenters, hardware, and the hypervisor, while the customer is responsible for securing and patching the guest OS, firewall rules, and applications.'
    }
  },

  // ==========================================
  // 2. NETWORKING FUNDAMENTALS
  // ==========================================
  {
    id: 'lab-net-osi-tcp',
    lessonId: 'net-osi-tcp',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'Packet Encapsulation & OSI Stack Inspector',
    objective: 'Step through how an HTTPS web request is wrapped (encapsulated) from Application payload down to physical bits on a network.',
    shortExplanation: 'As data travels down the network stack, each layer adds its own header so switches, routers, and destination apps know how to deliver it.',
    expectedOutcome: 'Inspect all encapsulation stages and identify the Protocol Data Unit (PDU) created at Layer 2.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'osi-app',
        label: '1. Application Layer (L7–L5)',
        role: 'Payload Data',
        summary: 'User applications generate structured data such as an HTTP GET request or DNS lookup.',
        details: [
          'Maps to the Application layer in the 4-layer TCP/IP model',
          'Protocols include HTTPS, DNS, SSH, and SMTP',
          'Data unit: Application Payload'
        ],
        securityRelevance: 'Application-layer firewalls and TLS protect payload confidentiality and validate user input.',
        sampleMetric: 'PDU: Data'
      },
      {
        id: 'osi-transport',
        label: '2. Transport Layer (L4)',
        role: 'Segment (TCP/UDP Header)',
        summary: 'Adds source and destination port numbers (e.g., port 443) and sequencing/reliability flags.',
        details: [
          'TCP ensures reliable, ordered delivery with sequence numbers',
          'UDP provides fast, connectionless datagrams',
          'Ports route traffic to the exact listening service'
        ],
        securityRelevance: 'Port scanning checks which Layer 4 ports are open and reachable on a host.',
        sampleMetric: 'PDU: Segment'
      },
      {
        id: 'osi-network',
        label: '3. Network Layer (L3)',
        role: 'Packet (IP Header)',
        summary: 'Wraps the segment with logical source and destination IP addresses so routers can forward it across subnets.',
        details: [
          'Uses IPv4 or IPv6 logical addressing',
          'Routers inspect destination IP against routing tables',
          'TTL (Time To Live) prevents infinite routing loops'
        ],
        securityRelevance: 'Firewalls filter Layer 3 packets by source/destination IP ranges and block spoofed routes.',
        sampleMetric: 'PDU: Packet'
      },
      {
        id: 'osi-datalink',
        label: '4. Data Link & Physical (L2–L1)',
        role: 'Frame (MAC Header) -> Bits',
        summary: 'Adds local hardware MAC addresses and error-check trailers (Frame), then encodes it as electrical, optical, or radio signals (Bits).',
        details: [
          'Layer 2 switches forward Frames locally using MAC tables',
          'FCS trailer detects corrupted bits in transit',
          'Layer 1 transmits raw 1s and 0s over copper, fiber, or Wi-Fi'
        ],
        securityRelevance: 'ARP spoofing and MAC flooding target Layer 2 local switching.',
        sampleMetric: 'PDU: Frame / Bits'
      }
    ],
    challenge: {
      prompt: 'When a router passes an IP packet onto a local Ethernet network and the network adapter wraps it with source and destination MAC addresses, what is the resulting Layer 2 unit called?',
      options: [
        'A TCP Segment',
        'An Ethernet Frame',
        'A Network Socket',
        'A UDP Datagram'
      ],
      correctIndex: 1,
      hint: 'Check Stage 4 (Data Link Layer): TCP creates Segments, IP creates Packets, and Layer 2 creates...',
      explanation: 'At Layer 2 (Data Link), packets receive physical MAC address headers and a frame check sequence trailer, forming a Frame before Layer 1 converts it into physical bits.'
    }
  },
  {
    id: 'lab-ip-subnetting',
    lessonId: 'ip-subnetting',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'CIDR Subnet Calculator & Segmentation Lab',
    objective: 'Compare common CIDR blocks (/24, /26, /28, /30) to see how subnet masks control usable host counts and network isolation.',
    shortExplanation: 'Smaller subnets limit how many devices share a broadcast domain, helping network engineers isolate servers from guest Wi-Fi.',
    expectedOutcome: 'Explore at least 3 CIDR blocks and calculate usable hosts in a /26 subnet.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'cidr-24',
        label: '/24 (255.255.255.0)',
        role: '256 Total · 254 Usable Hosts',
        summary: 'Standard small office or department LAN dedicating 24 bits to the network ID and 8 bits to hosts.',
        details: [
          'Example range: 192.0.2.0 – 192.0.2.255',
          'Reserved: .0 (Network ID) and .255 (Broadcast)',
          'Usable host range: .1 through .254'
        ],
        securityRelevance: 'Large flat /24 networks make lateral movement easier if hosts are not segmented.',
        sampleMetric: '2⁸ - 2 = 254'
      },
      {
        id: 'cidr-26',
        label: '/26 (255.255.255.192)',
        role: '64 Total · 62 Usable Hosts',
        summary: 'Splits a /24 block into 4 smaller subnets of 64 addresses each using 6 host bits.',
        details: [
          'First subnet: 192.0.2.0 – 192.0.2.63',
          'Reserved: .0 (Network ID) and .63 (Broadcast)',
          'Usable host range: .1 through .62'
        ],
        securityRelevance: 'Ideal for separating a 40-server database tier from general office workstations.',
        sampleMetric: '2⁶ - 2 = 62'
      },
      {
        id: 'cidr-28',
        label: '/28 (255.255.255.240)',
        role: '16 Total · 14 Usable Hosts',
        summary: 'Tightly scoped subnet leaving 4 host bits for small critical infrastructure clusters.',
        details: [
          'Example range: 192.0.2.0 – 192.0.2.15',
          'Usable host range: .1 through .14',
          'Minimizes unused IP space'
        ],
        securityRelevance: 'Reduces attack surface by tightly sizing management or DMZ subnets.',
        sampleMetric: '2⁴ - 2 = 14'
      },
      {
        id: 'cidr-30',
        label: '/30 (255.255.255.252)',
        role: '4 Total · 2 Usable Hosts',
        summary: 'Point-to-point subnet between two routers with zero spare addresses for rogue devices.',
        details: [
          'Example range: 192.0.2.0 – 192.0.2.3',
          'Usable hosts: .1 and .2 only',
          'Common on dedicated firewall-to-router links'
        ],
        securityRelevance: 'Prevents unauthorized extra hosts from joining a router-to-router transit link.',
        sampleMetric: '2² - 2 = 2'
      }
    ],
    challenge: {
      prompt: 'You are segmenting a lab branch network (`192.0.2.0/26`) for 50 workstations. How many usable host IP addresses are available inside a `/26` subnet?',
      options: [
        '64 total usable workstation IP addresses',
        '126 usable workstation IP addresses',
        '62 usable host IP addresses (minus Network and Broadcast)',
        '254 total usable workstation IP addresses'
      ],
      correctIndex: 2,
      hint: 'A /26 leaves 6 host bits (32 - 26 = 6). Compute 2⁶ and remember to subtract the Network ID and Broadcast address.',
      explanation: '32 total IPv4 bits minus 26 network bits leaves 6 host bits (2⁶ = 64 addresses). Subtracting the Network ID (.0) and Broadcast address (.63) leaves 62 usable host IP addresses.'
    }
  },
  {
    id: 'lab-infra-protocols',
    lessonId: 'infra-protocols',
    kind: 'terminal',
    title: 'DNS, ARP & Connectivity Diagnostic Terminal',
    objective: 'Run safe network diagnostic commands (`dig`, `arp -a`, `ping`) in the simulated terminal to trace how hostnames become IPs and MAC addresses.',
    shortExplanation: 'Before traffic leaves your machine, DNS translates domain names to IPs, DHCP assigns your IP lease, and ARP finds the local gateway MAC address.',
    expectedOutcome: 'Execute `dig`, `arp -a`, and `ping` in the terminal and interpret the resolved IP and MAC bindings.',
    xpReward: 75,
    terminalPromptPrefix: 'student@lab-ws-01:~$',
    requiredCommands: ['dig example.internal', 'arp -a', 'ping -c 4 192.0.2.1'],
    terminalCommands: [
      {
        command: 'dig example.internal',
        aliases: ['dig', 'nslookup example.internal'],
        description: 'Queries DNS for the IPv4 A-record of a fictional internal domain.',
        flagsSummary: 'Default A-record DNS query over UDP port 53.',
        output: `; <<>> DiG 9.18.18 <<>> example.internal
;; QUESTION SECTION:
;example.internal.              IN      A

;; ANSWER SECTION:
example.internal.       300     IN      A       192.0.2.50

;; Query time: 4 msec
;; SERVER: 192.0.2.2#53(192.0.2.2)`,
        interpretation: '`example.internal` resolves to `192.0.2.50` via DNS server `192.0.2.2` on port 53.'
      },
      {
        command: 'arp -a',
        aliases: ['arp'],
        description: 'Displays the local IP-to-MAC address translation cache.',
        flagsSummary: '`-a` prints all cached entries in standard format.',
        output: `gateway.internal (192.0.2.1) at 00:53:00:1a:2b:01 [ether] on eth0
filesrv.internal (192.0.2.25) at 00:53:00:1a:2b:99 [ether] on eth0`,
        interpretation: 'Maps Layer 3 IPs on your LAN to Layer 2 hardware MAC addresses. Duplicate MACs for different IPs can indicate ARP spoofing.'
      },
      {
        command: 'ping -c 4 192.0.2.1',
        aliases: ['ping'],
        description: 'Sends 4 ICMP Echo Request packets to verify reachability and latency.',
        flagsSummary: '`-c 4` stops automatically after sending 4 ICMP packets.',
        output: `PING 192.0.2.1 (192.0.2.1) 56(84) bytes of data.
64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.82 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=64 time=0.79 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=64 time=0.81 ms
64 bytes from 192.0.2.1: icmp_seq=4 ttl=64 time=0.80 ms

--- 192.0.2.1 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss`,
        interpretation: '0% packet loss and TTL=64 confirm healthy local ICMP connectivity to the gateway.'
      }
    ],
    challenge: {
      prompt: 'After running `arp -a` on `lab-ws-01`, you notice that both `gateway.internal (192.0.2.1)` and an unfamiliar workstation suddenly share the exact same MAC address. Which protocol attack does this strongly suggest?',
      options: [
        'ARP Spoofing or cache poisoning on the local LAN subnet',
        'TCP Three-Way Handshake SYN flood resource exhaustion',
        'DHCP dynamic lease table exhaustion across the subnet',
        'ICMP Time Exceeded routing loop across local gateways'
      ],
      correctIndex: 0,
      hint: 'Which protocol maps IP addresses to physical MAC addresses on a local subnet?',
      explanation: 'ARP translates Layer 3 IPs to Layer 2 MAC addresses without authentication. When an attacker sends forged ARP replies claiming the gateway IP belongs to their MAC address, traffic is redirected through their machine (ARP spoofing).'
    }
  },
  {
    id: 'lab-transport-protocols',
    lessonId: 'transport-protocols',
    kind: 'terminal',
    title: 'Listening Ports & Socket Audit (`ss -tuln`)',
    objective: 'Inspect open TCP/UDP ports on a Linux server using `ss -tuln` and identify unexpected exposed services.',
    shortExplanation: 'Every network service binds to a TCP or UDP port. Auditing listening ports shows defenders exactly what is exposed to the network.',
    expectedOutcome: 'Run `ss -tuln` in the simulated terminal and interpret an insecure unencrypted Telnet binding.',
    xpReward: 75,
    terminalPromptPrefix: 'analyst@app-srv-02:~$',
    requiredCommands: ['ss -tuln'],
    terminalCommands: [
      {
        command: 'ss -tuln',
        aliases: ['ss', 'netstat -tuln'],
        description: 'Lists listening TCP and UDP sockets with numeric port numbers.',
        flagsSummary: '`-t` TCP, `-u` UDP, `-l` listening only, `-n` numeric ports (skip DNS lookup).',
        output: `Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port
udp    UNCONN  0       0       127.0.0.53:53        0.0.0.0:*
tcp    LISTEN  0       128     0.0.0.0:22           0.0.0.0:*
tcp    LISTEN  0       128     0.0.0.0:23           0.0.0.0:*
tcp    LISTEN  0       511     0.0.0.0:443          0.0.0.0:*
tcp    LISTEN  0       80      127.0.0.1:3306       0.0.0.0:*`,
        interpretation: 'Notice `0.0.0.0:23` (Telnet, unencrypted remote shell) is listening on all interfaces, while MySQL (`3306`) is safely bound only to `127.0.0.1`.'
      },
      {
        command: 'ss -tanp',
        aliases: ['ss -tp'],
        description: 'Shows established TCP connections and process context.',
        flagsSummary: '`-t` TCP, `-a` all states, `-n` numeric, `-p` process.',
        output: `State      Recv-Q Send-Q Local Address:Port  Peer Address:Port
ESTAB      0      0      192.0.2.15:22       192.0.2.100:51422  users:(("sshd",pid=1422,fd=4))`,
        interpretation: 'An active encrypted SSH session from admin workstation `192.0.2.100`.'
      }
    ],
    challenge: {
      prompt: 'Based on the `ss -tuln` output, why is `0.0.0.0:23` a security concern while `127.0.0.1:3306` is much safer?',
      options: [
        'Port 23 uses encrypted UDP tunnels while Port 3306 binds only to public external interfaces.',
        'Port 23 runs unencrypted Telnet on all interfaces (`0.0.0.0`), while MySQL (`127.0.0.1`) stays local.',
        'Binding a socket to `0.0.0.0` blocks all incoming packets except localhost traffic.',
        'Port 22 runs unencrypted Telnet sessions while Port 23 serves encrypted HTTPS web traffic.'
      ],
      correctIndex: 1,
      hint: 'Check what service traditionally uses TCP port 23 and compare binding to `0.0.0.0` (every interface) vs `127.0.0.1` (localhost).',
      explanation: 'Telnet (TCP port 23) transmits usernames, passwords, and commands in plaintext and should be disabled in favor of SSH (port 22). Meanwhile, binding MySQL (port 3306) to `127.0.0.1` prevents external hosts from connecting directly to the database.'
    }
  },
  {
    id: 'lab-switching-routing',
    lessonId: 'switching-routing',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Switch CAM Table, Router & VLAN Segmentation Explorer',
    objective: 'Explore how Layer 2 switches, VLAN broadcast domains, and Layer 3 routers isolate departmental traffic.',
    shortExplanation: 'Putting Finance, Guest Wi-Fi, and Production Servers on separate VLANs prevents devices in one group from sniffing broadcast traffic in another.',
    expectedOutcome: 'Inspect all network isolation components and diagnose how traffic crosses between VLANs.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'cam-switch',
        label: 'Layer 2 Switch & CAM Table',
        role: 'MAC-to-Port Forwarding',
        summary: 'Learns which hardware MAC address lives on each physical switch port and forwards unicast frames directly.',
        details: [
          'Maintains a Content Addressable Memory (CAM) table',
          'Floods unknown unicast or broadcast frames out all ports in the same VLAN',
          'Eliminates collisions per port'
        ],
        securityRelevance: 'Port security limits how many MAC addresses a single switch port can learn, preventing CAM table flooding.',
        sampleMetric: 'Layer 2 · MAC Table'
      },
      {
        id: 'vlan-10',
        label: 'VLAN 10 (Corporate Staff)',
        role: 'Isolated Broadcast Domain',
        summary: 'Groups staff workstations logically so ARP broadcasts stay inside VLAN 10.',
        details: [
          'Assigned subnet: 192.0.2.0/25',
          'Cannot directly receive Layer 2 frames from VLAN 20',
          'Tagged on trunk links via IEEE 802.1Q'
        ],
        securityRelevance: 'Prevents guest devices from capturing staff broadcast traffic on the same physical switch.',
        sampleMetric: '802.1Q Tag: 10'
      },
      {
        id: 'vlan-20',
        label: 'VLAN 20 (Guest Wi-Fi)',
        role: 'Untrusted Zone',
        summary: 'Isolates visitor devices from internal corporate workstations and servers.',
        details: [
          'Assigned subnet: 198.51.100.0/24',
          'Permitted outbound internet access only',
          'Blocked from reaching internal admin ports'
        ],
        securityRelevance: 'Contains rogue or infected guest laptops to an isolated broadcast segment.',
        sampleMetric: '802.1Q Tag: 20'
      },
      {
        id: 'l3-router',
        label: 'Layer 3 Router / Firewall',
        role: 'Inter-VLAN Routing & ACLs',
        summary: 'Routes IP packets between different VLAN subnets while enforcing security Access Control Lists (ACLs).',
        details: [
          'Operates at Layer 3 using IP routing tables',
          'Inspects and filters traffic moving between VLAN 10 and VLAN 20',
          'Drops unauthorized cross-VLAN access attempts'
        ],
        securityRelevance: 'Acts as the policy checkpoint whenever segmented zones need controlled communication.',
        sampleMetric: 'Layer 3 · Gateway'
      }
    ],
    challenge: {
      prompt: 'Staff workstations are on VLAN 10 and visitor laptops are on VLAN 20 on the same physical switch. What device is required for a packet to travel from VLAN 10 to VLAN 20?',
      options: [
        'A Layer 1 network signal repeater amplifying Ethernet electrical frames',
        'An unmanaged Layer 2 multi-port hub broadcasting frames across ports',
        'A local DNS caching resolver mapping hostnames to VLAN port numbers',
        'A Layer 3 Router or Layer 3 Switch performing Inter-VLAN routing and ACL checks'
      ],
      correctIndex: 3,
      hint: 'VLANs isolate Layer 2 broadcast domains. Which OSI layer routes traffic between different logical subnets?',
      explanation: 'VLANs strictly separate Layer 2 traffic. To cross between two VLANs (and enforce security rules between them), traffic must pass through a Layer 3 Router or Layer 3 switch.'
    }
  },
  {
    id: 'lab-vpn-firewalls',
    lessonId: 'vpn-firewalls',
    kind: 'scenario',
    title: 'Stateful Firewall Ruleset Audit (`iptables`)',
    objective: 'Inspect a Linux host firewall ruleset and fix a dangerous rule ordering mistake that exposes SSH globally.',
    shortExplanation: 'Firewalls evaluate rules top-to-bottom and stop at the first match. A misplaced ACCEPT rule or missing Implicit Deny policy leaves ports exposed.',
    expectedOutcome: 'Read the firewall chain rules and identify why the admin workstation restriction is bypassed.',
    xpReward: 75,
    artifactTitle: 'firewall-rules.v4 (Fictional Edge Server)',
    artifactLanguage: 'bash',
    artifactHighlightLines: [4, 5],
    artifactContent: `# Generated iptables INPUT chain (Policy: ACCEPT)
-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A INPUT -p tcp --dport 443 -j ACCEPT
-A INPUT -p tcp --dport 22 -j ACCEPT
-A INPUT -p tcp --dport 22 -s 192.0.2.100/32 -j ACCEPT
-A INPUT -j DROP`,
    challenge: {
      prompt: 'The security engineer intended to allow SSH (port 22) ONLY from admin IP `192.0.2.100`, yet anyone on the internet can still reach SSH. Why?',
      options: [
        'Line 2 blocks ESTABLISHED stateful connections instead of permitting return packets.',
        'HTTPS on port 443 automatically redirects external sessions onto SSH port 22.',
        'Line 4 allows all SSH traffic first before the restricted IP rule on line 5 runs.',
        'Line 6 (`-j DROP`) only filters outbound UDP traffic and ignores inbound TCP.'
      ],
      correctIndex: 2,
      hint: 'Firewalls process rules sequentially from top to bottom and stop on the first matching rule.',
      explanation: 'Because `iptables` stops at the first matching rule, the broad `-p tcp --dport 22 -j ACCEPT` on line 4 permits every source IP to connect to SSH before line 5 is evaluated. Removing line 4 ensures only `192.0.2.100/32` is accepted and everything else hits `-j DROP`.'
    }
  },

  // ==========================================
  // 3. LINUX ADMINISTRATION
  // ==========================================
  {
    id: 'lab-lin-fs',
    lessonId: 'lin-fs',
    kind: 'terminal',
    title: 'Linux Filesystem Hierarchy Explorer',
    objective: 'Navigate core Linux root directories (`/etc`, `/var/log`, `/proc`, `/dev`) in the simulated terminal to locate configuration files and system logs.',
    shortExplanation: 'Understanding where Linux stores configs (`/etc`), logs (`/var/log`), and kernel runtime info (`/proc`) is essential for administration and triage.',
    expectedOutcome: 'Run `pwd`, `ls -la /etc`, and `mount` to inspect system paths and active mounts.',
    xpReward: 75,
    terminalPromptPrefix: 'student@ubuntu-lab:~$',
    requiredCommands: ['pwd', 'ls -la /etc', 'mount'],
    terminalCommands: [
      {
        command: 'pwd',
        description: 'Prints your current working directory path.',
        flagsSummary: 'No flags required.',
        output: `/home/student`,
        interpretation: 'You are currently in your user home directory.'
      },
      {
        command: 'ls -la /etc',
        aliases: ['ls /etc'],
        description: 'Lists system configuration files inside `/etc`, including hidden files and permissions.',
        flagsSummary: '`-l` long format (permissions/owner/size), `-a` include hidden dotfiles.',
        output: `total 128
drwxr-xr-x 14 root root  4096 Nov 14 08:00 .
-rw-r--r--  1 root root   244 Nov 14 07:12 hosts
-rw-r--r--  1 root root  1842 Nov 14 07:12 passwd
-rw-r-----  1 root shadow 892 Nov 14 07:12 shadow
drwxr-xr-x  2 root root  4096 Nov 14 07:15 ssh`,
        interpretation: 'Notice `/etc/passwd` is world-readable (`644`), while `/etc/shadow` (hashed passwords) restricts read access to `root` and `shadow` (`640`).'
      },
      {
        command: 'mount',
        aliases: ['mount | grep'],
        description: 'Shows attached filesystems and mount options.',
        flagsSummary: 'Displays device paths, mount points, filesystem types, and flags.',
        output: `/dev/nvme0n1p2 on / type ext4 (rw,relatime)
/dev/nvme0n1p1 on /boot/efi type vfat (rw,nosuid,nodev,noexec)
tmpfs on /tmp type tmpfs (rw,nosuid,nodev,noexec)`,
        interpretation: '`/tmp` is mounted with `noexec` and `nosuid`—a hardening control that blocks executing scripts dropped in `/tmp`.'
      }
    ],
    challenge: {
      prompt: 'During an audit of `/etc`, why is `/etc/shadow` set to `-rw-r-----` (`640`) instead of `-rw-r--r--` (`644`) like `/etc/passwd`?',
      options: [
        '`/etc/shadow` contains temporary USB device mount mappings cleared during each reboot.',
        '`/etc/shadow` holds salted password hashes that unprivileged users must not read.',
        '`/etc/passwd` stores encrypted passwords while `/etc/shadow` only lists login names.',
        '`640` permissions grant every non-root local user write access to system passwords.'
      ],
      correctIndex: 1,
      hint: 'Check what sensitive data lives inside `/etc/shadow` compared to `/etc/passwd`.',
      explanation: 'Legacy Unix stored password hashes in world-readable `/etc/passwd`. Modern Linux separates hashed credentials into `/etc/shadow` with strict `640` (`root:shadow`) permissions so regular users cannot extract hashes for offline cracking.'
    }
  },
  {
    id: 'lab-lin-permissions',
    lessonId: 'lin-permissions',
    kind: 'terminal',
    title: 'Linux File Permissions & Least-Privilege Lab',
    objective: 'Audit insecure file permissions on an SSH private key and lock them down using `chmod`.',
    shortExplanation: 'If an SSH private key or service script is readable or writable by other users, attackers with local access can steal credentials or inject code.',
    expectedOutcome: 'Inspect `ls -la`, fix `id_rsa` permissions with `chmod 600 id_rsa`, and verify the updated permission mask.',
    xpReward: 75,
    terminalPromptPrefix: 'student@ubuntu-lab:~/.ssh$',
    requiredCommands: ['ls -la', 'chmod 600 id_rsa'],
    terminalCommands: [
      {
        command: 'ls -la',
        aliases: ['ls -l'],
        description: 'Inspects file permissions, owner, and group in `~/.ssh`.',
        flagsSummary: '`-l` long listing, `-a` all files.',
        output: `total 12
drwx------ 2 student student 4096 Nov 14 08:10 .
-rw-r--r-- 1 student student 1679 Nov 14 08:10 id_rsa
-rw-r--r-- 1 student student  398 Nov 14 08:10 id_rsa.pub`,
        interpretation: '`id_rsa` currently has `-rw-r--r--` (`644`), meaning any user on the system can read your private key!'
      },
      {
        command: 'chmod 600 id_rsa',
        aliases: ['chmod 0600 id_rsa'],
        description: 'Restricts `id_rsa` so only the file owner (`student`) can read and write it.',
        flagsSummary: '`6` (read+write) for owner, `0` for group, `0` for others.',
        output: `Updated permissions on id_rsa -> -rw------- (0600).
OpenSSH private key check: SECURE`,
        interpretation: 'Group and others now have zero permissions (`---`), which OpenSSH strictly requires before allowing key-based login.'
      }
    ],
    challenge: {
      prompt: 'You see a backup script owned by `root` with permissions `-rwxrwxrwx` (`777`). Why is `777` dangerous on a multi-user Linux server?',
      options: [
        'Setting `777` automatically removes the file owner UID entry from `/etc/passwd`.',
        'Mode `777` encrypts the script body so even `root` cannot inspect or verify it.',
        'Permission mask `777` strips execution rights from the owner while allowing reads.',
        'Any local user can modify the script so their code runs under `root` privileges.'
      ],
      correctIndex: 3,
      hint: 'Break down the three octets in `777`: Owner (`rwx`), Group (`rwx`), and Others (`rwx`). Notice who gets write (`w`) access!',
      explanation: 'World-writable (`777`) files let any local account alter the file’s contents. If `root` or a scheduled cron job runs that script, an attacker can insert arbitrary commands to escalate privileges.'
    }
  },
  {
    id: 'lab-bash-scripting',
    lessonId: 'bash-scripting',
    kind: 'scenario',
    title: 'Defensive Bash Script Security Review',
    objective: 'Review a small log-backup Bash script and spot a risky unquoted variable / unsafe command practice.',
    shortExplanation: 'Automation scripts often run with elevated privileges. Unquoted variables or predictable `/tmp` filenames can cause unintended behavior or privilege issues.',
    expectedOutcome: 'Inspect the Bash script and select the safest remediation.',
    xpReward: 75,
    artifactTitle: 'backup_logs.sh',
    artifactLanguage: 'bash',
    artifactHighlightLines: [5, 6],
    artifactContent: `#!/bin/bash
LOG_DIR="/var/log/nginx"
TARGET=$1
# Unquoted user input + running without error checking
cp $LOG_DIR/*.log /tmp/$TARGET
chmod 777 /tmp/$TARGET/*.log
echo "Backup complete"`,
    challenge: {
      prompt: 'Which change most directly fixes the security flaw on line 6 (`chmod 777 /tmp/$TARGET/*.log`)?',
      options: [
        'Remove `chmod 777`, write to a restricted `600` folder, and quote `"$TARGET"`.',
        'Switch the script shebang to `#!/bin/sh` so file permissions do not execute.',
        'Prepend `sudo` in front of `chmod 777` so root ownership protects `/tmp`.',
        'Replace `echo` with `printf` and suppress all standard error console messages.'
      ],
      correctIndex: 0,
      hint: 'Think about why world-readable/writable logs in `/tmp` and unquoted inputs are unsafe.',
      explanation: 'Writing logs into `/tmp` with `777` permissions exposes sensitive log entries (IPs, tokens, paths) to every local user and invites tampering. Always use restricted directories (`700`/`600`), quote variables (`"$VAR"`), and validate inputs.'
    }
  },
  {
    id: 'lab-lin-logfiltering',
    lessonId: 'lin-logfiltering',
    kind: 'log_investigation',
    title: 'SSH Authentication Log Investigation (`/var/log/auth.log`)',
    objective: 'Filter fictional Linux authentication logs to spot a brute-force login anomaly followed by a suspicious success.',
    shortExplanation: 'Security analysts use tools like `grep` and `awk` on `/var/log/auth.log` to separate routine logins from brute-force attempts.',
    expectedOutcome: 'Filter the log stream, identify the anomalous entry, and choose the right defensive response.',
    xpReward: 75,
    logContextTitle: '/var/log/auth.log (Fictional Lab Host: web-srv-01)',
    suspiciousEntryId: 'log-auth-4',
    logEntries: [
      {
        id: 'log-auth-1',
        timestamp: '08:12:04',
        source: 'sshd[2104]',
        severity: 'INFO',
        message: 'Accepted publickey for deploy from 192.0.2.10 port 51022 ssh2',
        details: 'Expected automated deployment key login from internal CI runner.'
      },
      {
        id: 'log-auth-2',
        timestamp: '08:14:11',
        source: 'sshd[2180]',
        severity: 'WARN',
        message: 'Failed password for invalid user admin from 198.51.100.77 port 44120 ssh2',
        details: 'Attempted login with non-existent username `admin` from external IP.'
      },
      {
        id: 'log-auth-3',
        timestamp: '08:14:13',
        source: 'sshd[2182]',
        severity: 'WARN',
        message: 'Failed password for root from 198.51.100.77 port 44125 ssh2',
        details: 'Repeated password guessing targeting `root` from the same external IP.'
      },
      {
        id: 'log-auth-4',
        timestamp: '08:14:19',
        source: 'sshd[2190]',
        severity: 'ALERT',
        message: 'Accepted password for backup_svc from 198.51.100.77 port 44139 ssh2',
        details: 'CRITICAL: After failed brute-force attempts from 198.51.100.77, password auth SUCCEEDED for service account `backup_svc`!',
        isSuspicious: true
      },
      {
        id: 'log-auth-5',
        timestamp: '08:20:00',
        source: 'CRON[2240]',
        severity: 'INFO',
        message: 'pam_unix(cron:session): session opened for user root',
        details: 'Scheduled routine logrotate cron task.'
      }
    ],
    challenge: {
      prompt: 'You spotted `Accepted password for backup_svc from 198.51.100.77` immediately after repeated failed logins from that same IP. What is the highest-priority immediate defensive action?',
      options: [
        'Delete `/var/log/auth.log` immediately so repeated SSH alert entries stop filling disk.',
        'Change `backup_svc` home directory and shell script permissions directly to `777`.',
        'Lock `backup_svc`, kill active sessions, block `198.51.100.77`, and require SSH keys.',
        'Ignore the event because `Accepted password` confirms valid credentials were entered.'
      ],
      correctIndex: 2,
      hint: 'An external IP succeeded via password login right after brute-forcing other accounts.',
      explanation: 'A successful password login from an IP actively brute-forcing accounts indicates compromised credentials. Contain the account (`usermod -L` / terminate sessions), rotate credentials, block the source IP, and disable `PasswordAuthentication` in `sshd_config`.'
    }
  },
  {
    id: 'lab-lin-services',
    lessonId: 'lin-services',
    kind: 'terminal',
    title: 'Systemd Service & Scheduled Task Audit',
    objective: 'Inspect systemd unit status and active cron jobs to verify whether an unauthorized service is running.',
    shortExplanation: 'Attackers often establish persistence through rogue systemd services or cron tasks. Administrators check `systemctl` and `journalctl` to monitor service health.',
    expectedOutcome: 'Run `systemctl status cron` and `systemctl list-units --type=service` and interpret the service output.',
    xpReward: 75,
    terminalPromptPrefix: 'admin@app-srv-01:~$',
    requiredCommands: ['systemctl status cron', 'systemctl list-units --type=service --state=running'],
    terminalCommands: [
      {
        command: 'systemctl status cron',
        aliases: ['service cron status'],
        description: 'Checks whether the scheduled task daemon (`cron`) is active and healthy.',
        flagsSummary: '`status` prints unit load state, active state, PID, and recent journal lines.',
        output: `● cron.service - Regular background program processing daemon
     Loaded: loaded (/lib/systemd/system/cron.service; enabled)
     Active: active (running) since Thu 2026-11-14 06:00:12 UTC; 2h ago
   Main PID: 712 (cron)
      Tasks: 1 (limit: 4614)
     CGroup: /system.slice/cron.service`,
        interpretation: '`Loaded: loaded (...; enabled)` means cron starts automatically at boot, and `Active: active (running)` confirms PID 712 is live.'
      },
      {
        command: 'systemctl list-units --type=service --state=running',
        aliases: ['systemctl list-units'],
        description: 'Lists all currently running background services on the host.',
        flagsSummary: '`--type=service` filters to service units; `--state=running` shows only active ones.',
        output: `UNIT               LOAD   ACTIVE SUB     DESCRIPTION
cron.service       loaded active running Regular background program daemon
nginx.service      loaded active running High performance web server
ssh.service        loaded active running OpenBSD Secure Shell server
shadow-sync.service loaded active running Custom script /tmp/.sync.sh`,
        interpretation: 'Look closely at `shadow-sync.service`: running a hidden script out of `/tmp/.sync.sh` is a classic persistence red flag!'
      }
    ],
    challenge: {
      prompt: 'In the `systemctl list-units` output, which service entry represents an urgent security anomaly requiring immediate inspection?',
      options: [
        '`nginx.service` serving static HTTPS and web application pages cleanly',
        '`shadow-sync.service` launching a hidden script from `/tmp/.sync.sh`',
        '`cron.service` executing standard scheduled system log rotation tasks',
        '`ssh.service` listening on port 22 for authorized remote administration'
      ],
      correctIndex: 1,
      hint: 'Legitimate system services live in `/usr/sbin` or `/lib/systemd`, not hidden dotfiles inside `/tmp`.',
      explanation: 'Hidden scripts inside `/tmp` (like `/tmp/.sync.sh`) registered as persistent systemd services are strong indicators of unauthorized persistence. Inspect the unit file (`systemctl cat shadow-sync.service`), stop/disable it, and audit how it was created.'
    }
  },
  {
    id: 'lab-lin-remote',
    lessonId: 'lin-remote',
    kind: 'scenario',
    title: 'Hardening OpenSSH Daemon Configuration',
    objective: 'Audit an `/etc/ssh/sshd_config` file and identify which directives expose the server to password brute-forcing.',
    shortExplanation: 'SSH is the primary administrative gateway for Linux servers. Disabling root login and plaintext password auth drastically reduces remote compromise risk.',
    expectedOutcome: 'Inspect the SSH daemon config lines and select the proper hardening fix.',
    xpReward: 75,
    artifactTitle: '/etc/ssh/sshd_config (Excerpt)',
    artifactLanguage: 'ini',
    artifactHighlightLines: [3, 4],
    artifactContent: `Port 22
Protocol 2
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
AllowUsers deploy admin_ops`,
    challenge: {
      prompt: 'Which pair of changes best hardens this `sshd_config` against automated password brute-force attacks on privileged accounts?',
      options: [
        'Set `PermitRootLogin no` and `PasswordAuthentication no` to require SSH keys.',
        'Set `PubkeyAuthentication no` while keeping `PermitRootLogin yes` active.',
        'Downgrade `Protocol 2` to legacy `Protocol 1` for backward compatibility.',
        'Remove `AllowUsers` so all system and service accounts can open SSH shells.'
      ],
      correctIndex: 0,
      hint: 'Review lines 3 and 4: should direct `root` SSH login or password guesses be permitted when SSH keys are configured?',
      explanation: 'Setting `PermitRootLogin no` blocks direct remote attacks against the `root` account, and `PasswordAuthentication no` forces cryptographic SSH key authentication—eliminating password-guessing attacks.'
    }
  },

  // ==========================================
  // 4. WINDOWS ADMINISTRATION
  // ==========================================
  {
    id: 'lab-win-arch',
    lessonId: 'win-arch',
    kind: 'scenario',
    title: 'Windows Registry Persistence Investigation',
    objective: 'Inspect a Windows Registry Run-key export and identify an unauthorized startup entry.',
    shortExplanation: 'Windows Registry `Run` hives automatically launch listed programs whenever a user signs in, making them a common spot for both legitimate updaters and unwanted persistence.',
    expectedOutcome: 'Examine the registry values and identify the suspicious startup entry.',
    xpReward: 75,
    artifactTitle: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    artifactLanguage: 'ini',
    artifactHighlightLines: [4],
    artifactContent: `[HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run]
"OneDrive"="\"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe\" /background"
"TeamsUpdater"="\"C:\\Users\\analyst\\AppData\\Local\\Microsoft\\Teams\\Update.exe\""
"WinHelperUpdate"="powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\\Users\\Public\\helper.ps1"`,
    challenge: {
      prompt: 'Which Registry entry in `CurrentVersion\\Run` is anomalous and warrants immediate incident investigation?',
      options: [
        '`OneDrive` launching automatically from `C:\\Program Files\\Microsoft OneDrive\\`',
        '`TeamsUpdater` running cleanly from the signed Microsoft AppData folder',
        'All startup values under `HKEY_CURRENT_USER` are cryptographically verified by Windows',
        '`WinHelperUpdate` running hidden PowerShell (`ExecutionPolicy Bypass`) from `Public`'
      ],
      correctIndex: 3,
      hint: 'Look for a program hiding its window, bypassing execution policies, and running from a shared `Public` folder.',
      explanation: 'Legitimate software runs signed binaries from `Program Files` or vendor folders. A Run key invoking `powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass` on a script inside `C:\\Users\\Public` is a textbook persistence indicator.'
    }
  },
  {
    id: 'lab-win-shells',
    lessonId: 'win-shells',
    kind: 'terminal',
    title: 'PowerShell Process & Network Inspection Lab',
    objective: 'Use PowerShell inspection commands (`Get-Process`, `Get-NetTCPConnection`) in the simulated shell to spot an unexpected process.',
    shortExplanation: 'PowerShell returns structured objects rather than plain text, allowing administrators to filter processes, executable paths, and network connections cleanly.',
    expectedOutcome: 'Run `Get-Process` and `Get-NetTCPConnection` and identify the anomalous parent/executable path.',
    xpReward: 75,
    terminalPromptPrefix: 'PS C:\\Users\\Analyst>',
    requiredCommands: ['Get-Process', 'Get-NetTCPConnection -State Established'],
    terminalCommands: [
      {
        command: 'Get-Process',
        aliases: ['tasklist'],
        description: 'Lists active Windows processes with memory and PID identifiers.',
        flagsSummary: 'Default PowerShell process object listing.',
        output: `Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  ProcessName
-------  ------    -----      -----     ------     --  -----------
    412      22    18420      29100       1.12   1044  svchost
    685      34    54120      72400       4.30   2410  explorer
    190      14    22100      31040       0.85   4888  notepad_updater`,
        interpretation: '`notepad_updater` (PID 4888) is not a standard Windows component—check its network connections!'
      },
      {
        command: 'Get-NetTCPConnection -State Established',
        aliases: ['Get-NetTCPConnection'],
        description: 'Lists active TCP socket connections along with owning Process IDs.',
        flagsSummary: '`-State Established` filters for live outbound/inbound connections.',
        output: `LocalAddress   LocalPort RemoteAddress   RemotePort State       OwningProcess
------------   --------- -------------   ---------- -----       -------------
192.0.2.20     52104     198.51.100.88   8443       Established 4888`,
        interpretation: 'PID `4888` (`notepad_updater`) maintains an active outbound connection to external IP `198.51.100.88:8443`.'
      }
    ],
    challenge: {
      prompt: 'How did correlating `Get-Process` and `Get-NetTCPConnection` help confirm `notepad_updater` is suspicious?',
      options: [
        'Because `explorer` allocated noticeably more memory handles than `svchost`.',
        'Because `Get-Process` automatically terminates suspicious outbound TCP sockets.',
        '`OwningProcess` PID `4888` linked the unusual binary to external port `8443`.',
        'Because standard Windows `notepad.exe` always listens on remote port `8443`.'
      ],
      correctIndex: 2,
      hint: 'Compare the `Id` column in `Get-Process` with `OwningProcess` in `Get-NetTCPConnection`.',
      explanation: 'Correlating PIDs across `Get-Process` and `Get-NetTCPConnection` lets analysts prove which executable owns an unexpected outbound socket so they can inspect the binary and isolate the host.'
    }
  },
  {
    id: 'lab-win-ad-logs',
    lessonId: 'win-ad-logs',
    kind: 'log_investigation',
    title: 'Windows Security Event Log Triage (4624 / 4625 / 4688)',
    objective: 'Inspect Windows Event Log entries to recognize failed logon bursts (4625) and suspicious PowerShell process creation (4688).',
    shortExplanation: 'Windows Security Event IDs tell a timeline: `4625` logs failed sign-ins, `4624` logs successful sign-ins, and `4688` tracks newly launched processes.',
    expectedOutcome: 'Identify the highest-risk event entry in the domain workstation log.',
    xpReward: 75,
    logContextTitle: 'Windows Security & System Event Log (lab-dc-01)',
    suspiciousEntryId: 'win-ev-4',
    logEntries: [
      {
        id: 'win-ev-1',
        timestamp: '09:01:10',
        source: 'EventID 4624',
        severity: 'INFO',
        message: 'An account was successfully logged on. Account: j.smith (Logon Type 2 - Interactive)',
        details: 'Normal morning workstation sign-in by user j.smith.'
      },
      {
        id: 'win-ev-2',
        timestamp: '09:05:44',
        source: 'EventID 4625',
        severity: 'WARN',
        message: 'An account failed to log on. Account: svc_sql (Logon Type 3 - Network, Source: 192.0.2.77)',
        details: 'Bad password attempt from internal workstation 192.0.2.77.'
      },
      {
        id: 'win-ev-3',
        timestamp: '09:06:02',
        source: 'EventID 4624',
        severity: 'INFO',
        message: 'An account was successfully logged on. Account: svc_sql (Source: 192.0.2.77)',
        details: 'Service account svc_sql logged in over the network from 192.0.2.77.'
      },
      {
        id: 'win-ev-4',
        timestamp: '09:06:18',
        source: 'EventID 4688',
        severity: 'ALERT',
        message: 'New Process Created: powershell.exe -EncodedCommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA... (Parent: winword.exe)',
        details: 'ALERT: Microsoft Word (`winword.exe`) spawned an obfuscated `-EncodedCommand` PowerShell process.',
        isSuspicious: true
      }
    ],
    challenge: {
      prompt: 'Why is Event ID 4688 showing `winword.exe` spawning `powershell.exe -EncodedCommand` a major security alert?',
      options: [
        'Word rarely spawns encoded PowerShell shells, pointing to document execution.',
        'Event ID 4688 only triggers whenever Windows Defender completes a clean scan.',
        'Microsoft Word regularly spawns encoded PowerShell scripts to save `.docx` files.',
        'Event ID 4624 automatically suspends `winword.exe` when macros execute.'
      ],
      correctIndex: 0,
      hint: 'Look at the parent process (`winword.exe`) and the `-EncodedCommand` argument.',
      explanation: 'Monitoring parent-child process trees via Event ID 4688 (and Sysmon Event ID 1) catches office documents or browsers launching scripting engines like PowerShell—a hallmark of malicious attachments.'
    }
  },
  {
    id: 'lab-win-services-firewall',
    lessonId: 'win-services-firewall',
    kind: 'scenario',
    title: 'Windows Defender Firewall Profile & SMB Audit',
    objective: 'Audit a fictional Windows Firewall profile export and identify an unsafe Public-profile rule.',
    shortExplanation: 'Windows separates firewall rules into Domain, Private, and Public profiles. Exposing file-sharing ports (SMB 445) on Public networks puts laptops at high risk on untrusted Wi-Fi.',
    expectedOutcome: 'Spot the unsafe firewall state in the configuration report and select the right fix.',
    xpReward: 75,
    artifactTitle: 'netsh advfirewall show allprofiles (Workstation Audit)',
    artifactLanguage: 'ini',
    artifactHighlightLines: [7, 8],
    artifactContent: `Domain Profile Settings:
  State: ON
  InboundConnections: Block (Default)
Private Profile Settings:
  State: ON
Public Profile Settings:
  State: OFF
  AllowInboundRules: Port 445 (SMB) Enabled for Any IP`,
    challenge: {
      prompt: 'Which finding in the `netsh advfirewall` audit poses the greatest risk when an employee uses this laptop on airport or hotel Wi-Fi?',
      options: [
        'The Domain Profile blocks unsolicited inbound connections by default.',
        'Public firewall state is `OFF` and permits inbound SMB (port 445) from any IP.',
        'The Private Profile remains turned `ON` during trusted office network connections.',
        'The Domain Profile uses a default-deny inbound firewall filtering policy.'
      ],
      correctIndex: 1,
      hint: 'Untrusted Wi-Fi networks use the Windows Public network profile.',
      explanation: 'On untrusted Wi-Fi networks, Windows activates the Public profile. Turning the Public firewall OFF and allowing inbound SMB (port 445) exposes file shares and authentication services to anyone on the shared network.'
    }
  },

  // ==========================================
  // 5. VIRTUALIZATION & CONTAINERS
  // ==========================================
  {
    id: 'lab-hyp-compare',
    lessonId: 'hyp-compare',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Type 1 vs Type 2 Hypervisor Isolation Explorer',
    objective: 'Compare bare-metal Type 1 hypervisors, hosted Type 2 hypervisors, and OS-level containers to understand their isolation boundaries.',
    shortExplanation: 'Different virtualization layers offer different trade-offs between performance, convenience, and security isolation.',
    expectedOutcome: 'Inspect all 3 virtualization architectures and select the safest design for multi-tenant workloads.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'type1',
        label: 'Type 1 (Bare-Metal) Hypervisor',
        role: 'ESXi · KVM · Hyper-V',
        summary: 'Installs directly on physical server hardware without a general-purpose desktop OS underneath.',
        details: [
          'Minimal attack surface between hardware and guest VMs',
          'Each VM runs its own isolated OS kernel',
          'Industry standard for enterprise datacenters and public clouds'
        ],
        securityRelevance: 'Provides strong hardware-assisted virtualization boundaries between separate tenant VMs.',
        sampleMetric: 'Strong Kernel Isolation'
      },
      {
        id: 'type2',
        label: 'Type 2 (Hosted) Hypervisor',
        role: 'VirtualBox · VMware Workstation',
        summary: 'Runs as an application inside a host operating system like Windows, macOS, or Linux.',
        details: [
          'Great for local malware analysis labs and testing snapshots',
          'Depends on the security of the underlying host OS',
          'Slightly higher CPU/memory overhead'
        ],
        securityRelevance: 'Snapshots let students safely revert test environments, though host OS compromise affects all VMs.',
        sampleMetric: 'Lab & Desktop Use'
      },
      {
        id: 'containers',
        label: 'Containers (Shared Host Kernel)',
        role: 'Docker · containerd',
        summary: 'Packages applications using Linux namespaces and cgroups while sharing the host OS kernel.',
        details: [
          'Starts in milliseconds with minimal memory overhead',
          'No separate guest OS kernel per container',
          'Must avoid `--privileged` mode to preserve isolation'
        ],
        securityRelevance: 'Because containers share the host kernel, running containers as `root` or `--privileged` weakens isolation.',
        sampleMetric: 'Shared Kernel'
      }
    ],
    challenge: {
      prompt: 'Why does a Type 1 bare-metal hypervisor running separate guest VMs provide stronger multi-tenant isolation than standard containers?',
      options: [
        'Standard Linux containers cannot execute unmodified Linux software packages.',
        'Type 1 hypervisors isolate each VM inside a restricted web browser sandbox.',
        'Type 1 hypervisors disable hardware CPU virtualization extensions by default.',
        'Each VM uses an isolated guest kernel, whereas containers share one host kernel.'
      ],
      correctIndex: 3,
      hint: 'Compare how kernels are separated in VMs versus containers.',
      explanation: 'Virtual machines each maintain an independent guest OS kernel isolated by hardware virtualization (VT-x/AMD-V), whereas containers share the underlying host OS kernel.'
    }
  },
  {
    id: 'lab-docker-basics',
    lessonId: 'docker-basics',
    kind: 'scenario',
    title: 'Dockerfile Hardening & Least-Privilege Audit',
    objective: 'Inspect a sample application `Dockerfile` and eliminate a risky root-user / hardcoded-secret pattern.',
    shortExplanation: 'Running container processes as `root` or baking API secrets into image layers leaves credentials exposed to anyone who can pull or inspect the image.',
    expectedOutcome: 'Spot the insecure lines in the Dockerfile and select the best hardening fix.',
    xpReward: 75,
    artifactTitle: 'Dockerfile (Fictional Web API)',
    artifactLanguage: 'dockerfile',
    artifactHighlightLines: [3, 5],
    artifactContent: `FROM python:3.12-slim
WORKDIR /app
ENV DB_PASS="SuperSecretLabPass123!"
COPY . .
USER root
EXPOSE 8000
CMD ["python", "app.py"]`,
    challenge: {
      prompt: 'Which two improvements harden this `Dockerfile` before deploying to staging?',
      options: [
        'Drop hardcoded `DB_PASS` (use runtime secrets) and switch from `USER root`.',
        'Replace `python:3.12-slim` with a `USER root` instruction at the very bottom.',
        'Expose SSH port 22 and install `telnet` inside the container image.',
        'Run the container with `--privileged` so `DB_PASS` stays encrypted on disk.'
      ],
      correctIndex: 0,
      hint: 'Look at lines 3 and 5: secrets inside images can be extracted via `docker history`, and containers should not run as `root`.',
      explanation: 'Environment variables baked into a `Dockerfile` (`ENV DB_PASS=...`) remain visible in image metadata (`docker inspect` / `docker history`). Always inject secrets at runtime and create a dedicated non-root `USER`.'
    }
  },
  {
    id: 'lab-k8s-basics',
    lessonId: 'k8s-basics',
    kind: 'terminal',
    title: 'Kubernetes Pod & Service Inspection Lab',
    objective: 'Use `kubectl` in the simulated terminal to inspect running pods and verify container security posture.',
    shortExplanation: 'Kubernetes orchestrates pods across cluster nodes. Operators use `kubectl` to inspect workloads, logs, and exposed services.',
    expectedOutcome: 'Run `kubectl get pods` and `kubectl describe pod api-web` to locate the misconfigured container flag.',
    xpReward: 75,
    terminalPromptPrefix: 'ops@k8s-control:~$',
    requiredCommands: ['kubectl get pods', 'kubectl describe pod api-web-7f8d9c4b6-x2p9k'],
    terminalCommands: [
      {
        command: 'kubectl get pods',
        aliases: ['kubectl get po'],
        description: 'Lists active pods in the default namespace.',
        flagsSummary: 'Shows pod name, readiness, status, restarts, and age.',
        output: `NAME                      READY   STATUS    RESTARTS   AGE
api-web-7f8d9c4b6-x2p9k   1/1     Running   0          3d
redis-cache-5c67b89-m4t1q 1/1     Running   0          3d`,
        interpretation: 'Both pods are running; inspect `api-web` details to review its security context.'
      },
      {
        command: 'kubectl describe pod api-web-7f8d9c4b6-x2p9k',
        aliases: ['kubectl describe pod api-web', 'kubectl describe pod'],
        description: 'Prints detailed pod metadata, images, and securityContext settings.',
        flagsSummary: 'Inspects container configuration and events.',
        output: `Name:         api-web-7f8d9c4b6-x2p9k
Namespace:    default
Containers:
  api-web:
    Image:          registry.example.internal/api-web:1.4.2
    Port:           8080/TCP
    Security Context:
      Privileged:   true
      Run As User:  0 (root)`,
        interpretation: 'Warning: `Privileged: true` and `Run As User: 0` grant the pod host-level capabilities!'
      }
    ],
    challenge: {
      prompt: 'In the `kubectl describe pod` output, why should `Privileged: true` and `Run As User: 0` be remediated?',
      options: [
        '`Run As User: 0` stops the pod from binding or listening on TCP port 8080.',
        'Kubernetes requires `Privileged: true` for all production web applications.',
        'Privileged root pods gain broad host kernel access, raising escape risk.',
        'Non-root pods cannot resolve or communicate with `redis-cache` over DNS.'
      ],
      correctIndex: 2,
      hint: 'Check what `Privileged: true` and UID `0` grant a container relative to the underlying node.',
      explanation: 'Setting `privileged: false`, `runAsNonRoot: true`, and `allowPrivilegeEscalation: false` enforces least privilege inside Kubernetes pods.'
    }
  },

  // ==========================================
  // 6. GIT & DEVELOPMENT
  // ==========================================
  {
    id: 'lab-git-workflows',
    lessonId: 'git-workflows',
    kind: 'terminal',
    title: 'Preventing Secret Leaks in Git Commits',
    objective: 'Check staged files with `git status` and `git diff --staged` before committing so API keys are never pushed to a repository.',
    shortExplanation: 'Once an API key or password is committed to Git history, anyone who clones the repository can retrieve it—even if deleted in a later commit.',
    expectedOutcome: 'Run `git status` and `git diff --staged` to catch a staged `.env` secret file.',
    xpReward: 75,
    terminalPromptPrefix: 'dev@workstation:~/app-repo$',
    requiredCommands: ['git status', 'git diff --staged'],
    terminalCommands: [
      {
        command: 'git status',
        description: 'Shows modified, untracked, and staged files in the repository.',
        flagsSummary: 'Inspects working tree before committing.',
        output: `On branch feature/auth
Changes to be committed:
  new file:   .env.production
  modified:   src/config.ts`,
        interpretation: 'Alert: `.env.production` is staged to be committed into Git history!'
      },
      {
        command: 'git diff --staged',
        aliases: ['git diff --cached'],
        description: 'Displays the exact staged lines about to be committed.',
        flagsSummary: '`--staged` inspects changes already added with `git add`.',
        output: `diff --git a/.env.production b/.env.production
+API_SECRET="sk_live_example_9988776655"`,
        interpretation: 'Live secret detected! Unstage with `git reset HEAD .env.production` and add `.env*` to `.gitignore`.'
      }
    ],
    challenge: {
      prompt: 'You accidentally committed `.env.production` with a real secret key and pushed it to GitHub. Is deleting the file in a second commit enough to keep the secret safe?',
      options: [
        'Yes—deleting a file in the next commit erases it from all prior commits.',
        'No—Git history retains the commit, so rotate the secret and scrub history.',
        'Yes—dotfiles starting with `.env` are automatically encrypted on `git push`.',
        'Only if you rename the feature branch back to `main` before merging.'
      ],
      correctIndex: 1,
      hint: 'Think about how Git version history works when someone runs `git log -p`.',
      explanation: 'Git retains every prior commit snapshot. Even after a file is deleted in a new commit, anyone with repository access can check `git log -p` to read the secret—so you must revoke/rotate the credential and scrub history.'
    }
  },
  {
    id: 'lab-markup-formats',
    lessonId: 'markup-formats',
    kind: 'scenario',
    title: 'Structured Security Config Audit (JSON & YAML)',
    objective: 'Inspect a YAML security configuration file and spot syntax/indentation and policy mistakes.',
    shortExplanation: 'Tools like Kubernetes, Ansible, CI pipelines, and SIEM rules rely on valid YAML and JSON. Small indentation errors or careless booleans can disable security controls.',
    expectedOutcome: 'Review the YAML configuration and identify the policy misconfiguration.',
    xpReward: 75,
    artifactTitle: 'auth-gateway-policy.yaml',
    artifactLanguage: 'yaml',
    artifactHighlightLines: [5, 8],
    artifactContent: `service: portal-api
tls:
  enabled: true
  min_version: "1.2"
  verify_certificates: false
cors:
  allowed_origins:
    - "*"`,
    challenge: {
      prompt: 'Which two settings in `auth-gateway-policy.yaml` weaken transport and browser security?',
      options: [
        'Enabling `tls.enabled: true` alongside `min_version: "1.2"` for clients',
        'Declaring the application identifier `service: portal-api` at the top',
        'Formatting CORS arrays using hyphenated YAML list syntax lines',
        '`verify_certificates: false` (skips TLS validation) and `allowed_origins: ["*"]`'
      ],
      correctIndex: 3,
      hint: 'Check lines 5 and 8 for settings that disable verification or allow any origin.',
      explanation: 'Disabling certificate verification (`verify_certificates: false`) permits Man-in-the-Middle attacks, and wildcard CORS (`"*"`) with authenticated APIs can expose responses to untrusted origins.'
    }
  },

  // ==========================================
  // 7. PYTHON FOR CYBERSECURITY
  // ==========================================
  {
    id: 'lab-py-basics',
    lessonId: 'py-basics',
    kind: 'scenario',
    title: 'Python Security Automation Input Check',
    objective: 'Review a Python script used by a SOC team to tally failed logins by IP and spot a logic/safety issue.',
    shortExplanation: 'Python dictionaries and lists are ideal for summarizing security logs—as long as untrusted inputs are handled safely without `eval()` or unsafe shell execution.',
    expectedOutcome: 'Inspect the Python snippet and choose the secure improvement.',
    xpReward: 75,
    artifactTitle: 'triage_helper.py',
    artifactLanguage: 'python',
    artifactHighlightLines: [4, 5],
    artifactContent: `import os

def lookup_host(user_supplied_ip):
    # Unsafe: passes raw input directly to OS shell!
    os.system("ping -c 1 " + user_supplied_ip)`,
    challenge: {
      prompt: 'Why is `os.system("ping -c 1 " + user_supplied_ip)` dangerous if `user_supplied_ip` comes from an external form or log field?',
      options: [
        'Raw input permits command injection; validate inputs and use `shell=False` lists.',
        'Python `os.system` only executes commands on Windows hosts and fails on Linux.',
        'Joining IP strings in Python raises syntax errors whenever dots appear in IPv4.',
        'Calling `subprocess.run` with `shell=True` completely disables ICMP ping packets.'
      ],
      correctIndex: 0,
      hint: 'What happens if `user_supplied_ip` contains `;` or `&&` followed by another shell command?',
      explanation: 'Concatenating untrusted strings into `os.system()` lets an attacker inject extra shell commands. Always validate inputs strictly (e.g., `ipaddress.ip_address()`) and pass argument arrays to `subprocess.run(["ping", "-c", "1", safe_ip], shell=False)`.'
    }
  },
  {
    id: 'lab-py-file-regex',
    lessonId: 'py-file-regex',
    kind: 'terminal',
    title: 'Python Log Regex Extraction Lab',
    objective: 'Run a safe Python log-parsing script in the simulated terminal to extract suspicious external IP addresses using `re`.',
    shortExplanation: 'Analysts write quick Python scripts with regular expressions (`re`) to extract IPv4 addresses and failed authentication counts from large text logs.',
    expectedOutcome: 'Execute `python3 parse_auth.py` and inspect the extracted IP summary.',
    xpReward: 75,
    terminalPromptPrefix: 'analyst@sec-tools:~/scripts$',
    requiredCommands: ['python3 parse_auth.py'],
    terminalCommands: [
      {
        command: 'cat parse_auth.py',
        description: 'Displays the Python log parser script.',
        flagsSummary: 'Reads the script file.',
        output: `import re
from collections import Counter

pattern = re.compile(r"Failed password.*from (\\d+\\.\\d+\\.\\d+\\.\\d+)")
with open("sample_auth.log") as f:
    ips = pattern.findall(f.read())
print(Counter(ips).most_common(3))`,
        interpretation: 'Uses a compiled regex capture group to pull only the source IP from failed password lines.'
      },
      {
        command: 'python3 parse_auth.py',
        aliases: ['python parse_auth.py'],
        description: 'Executes the parser on `sample_auth.log` and prints top offending IPs.',
        flagsSummary: 'Outputs top 3 source IPs sorted by failure count.',
        output: `[('198.51.100.77', 42), ('203.0.113.19', 3), ('192.0.2.45', 1)]`,
        interpretation: '`198.51.100.77` generated 42 failed logins—far above normal baseline noise.'
      }
    ],
    challenge: {
      prompt: 'In the regex `r"Failed password.*from (\\d+\\.\\d+\\.\\d+\\.\\d+)"`, what do the parentheses `(...)` do?',
      options: [
        'They encrypt the matched IPv4 string before Python writes it to memory.',
        'They create a capture group so `findall()` returns only the matched IP.',
        'They instruct the regex engine to repeat the previous token four times.',
        'They tell the regex parser to ignore numeric octets inside the log file.'
      ],
      correctIndex: 1,
      hint: 'Look at what `pattern.findall()` returned in the Python output.',
      explanation: 'Parentheses `(...)` in Python regex create a capturing group. When present, `re.findall()` extracts just the text inside the group (the IP address), making `Counter(ips)` clean and accurate.'
    }
  },
  {
    id: 'lab-py-automation',
    lessonId: 'py-automation',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'Packet Dissection Workflow (Scapy Read-Only PCAP Analysis)',
    objective: 'Step through how security analysts safely inspect saved `.pcap` packet captures using Python and Scapy.',
    shortExplanation: 'Automating packet capture analysis with Python (`rdpcap`) lets defenders quickly summarize protocols, DNS queries, and anomalous ports offline without touching live production networks.',
    expectedOutcome: 'Explore the 4 offline PCAP inspection stages and answer the diagnostic question.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'pcap-load',
        label: '1. Load Saved Capture (`rdpcap`)',
        role: 'Offline PCAP File',
        summary: 'Reads a recorded `.pcap` capture safely into memory without sending packets onto any network.',
        details: [
          '`packets = rdpcap("lab_capture.pcap")`',
          'Safe, read-only offline analysis',
          'Preserves original timestamps and raw headers'
        ],
        securityRelevance: 'Offline PCAP analysis lets responders inspect malware beacons safely inside an isolated workstation.',
        sampleMetric: 'Read-Only Input'
      },
      {
        id: 'pcap-filter',
        label: '2. Check Protocol Layers',
        role: 'Layer Inspection (`pkt.haslayer`)',
        summary: 'Filters packets containing IP, TCP, UDP, or DNS layers before extracting fields.',
        details: [
          '`if pkt.haslayer(DNS) and pkt.haslayer(IP):`',
          'Prevents KeyError crashes on non-IP frames (like ARP)',
          'Targets specific protocols for triage'
        ],
        securityRelevance: 'Quickly separates routine ARP/broadcast chatter from suspicious DNS tunneling queries.',
        sampleMetric: 'Layer Filtering'
      },
      {
        id: 'pcap-extract',
        label: '3. Extract Metadata Fields',
        role: 'Source/Dest & Query Names',
        summary: 'Pulls source IP (`pkt[IP].src`), destination port (`pkt[TCP].dport`), or DNS query names (`pkt[DNSQR].qname`).',
        details: [
          'Builds clean frequency tables of contacted external IPs',
          'Flags unusually long subdomain strings in DNS queries',
          'Correlates timestamps with host logs'
        ],
        securityRelevance: 'Long high-entropy DNS subdomains often signal DNS exfiltration or C2 beaconing.',
        sampleMetric: 'IOC Extraction'
      },
      {
        id: 'pcap-report',
        label: '4. Export Triage Report',
        role: 'Actionable Findings',
        summary: 'Outputs a JSON or CSV summary of top talkers and anomalous ports for incident review.',
        details: [
          'Summarizes unique external destinations',
          'Feeds verified indicators into firewall blocklists',
          'Repeatable across incident captures'
        ],
        securityRelevance: 'Turns thousands of raw packets into clear evidence for containment decisions.',
        sampleMetric: 'SOC Triage Output'
      }
    ],
    challenge: {
      prompt: 'When analyzing an unfamiliar `.pcap` capture in Python with Scapy, why should your script check `if pkt.haslayer(IP):` before reading `pkt[IP].src`?',
      options: [
        'Scapy strips the IPv4 header unless `haslayer(IP)` is invoked beforehand.',
        'It automatically blocks the extracted source IP on the local host firewall.',
        'Not every captured frame contains an IP layer (e.g., ARP), avoiding crashes.',
        'It converts incoming IPv4 header addresses into physical Ethernet MACs.'
      ],
      correctIndex: 2,
      hint: 'Remember Layer 2 protocols like ARP—do they contain an IPv4 header?',
      explanation: 'Packet captures contain mixed traffic including ARP and STP frames. Checking `pkt.haslayer(IP)` ensures your script safely skips non-IP frames instead of raising an `IndexError`.'
    }
  }
];
