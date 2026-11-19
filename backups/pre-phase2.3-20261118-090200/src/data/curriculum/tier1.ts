import { Tier } from '../../types';

export const tier1: Tier = {
  id: 'tier-1',
  number: 1,
  title: 'Foundations',
  description: 'Master computer fundamentals, networking stacks, Linux administration, Windows services, containers, and scripting.',
  topics: [
    {
      id: 'computer-fundamentals',
      title: 'Computer Fundamentals',
      category: 'foundations',
      lessons: [
        {
          id: 'comp-hardware',
          title: 'Computer Hardware, CPU, RAM & Storage',
          description: 'Explore physical hardware, CPU architectures, volatile memory systems, and persistent storage media.',
          duration: '15 mins',
          content: `### Computer Hardware, CPU, RAM & Storage

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Identify core physical components of computer hardware.
- Differentiate between CPU registers, Cache, RAM, and Storage.
- Compare volatile and non-volatile memory architectures.

#### Key Concepts
- **Motherboard:** The central printed circuit board that connects all physical components.
- **CPU (Central Processing Unit):** The "brain" of the computer, executing instructions via the Fetch-Decode-Execute cycle.
- **RAM (Random Access Memory):** High-speed, volatile storage used for active programs and runtime state.
- **Persistent Storage (HDD vs. SSD vs. NVMe):** Non-volatile magnetic or solid-state media storing files permanently.

#### Hands-On Lab: Hardware Inspection
To view active hardware specifications on your system, use the following terminal tools:
\`\`\`bash
# On Linux, display CPU architecture details
lscpu

# On Linux, list block storage devices and partitioning
lsblk

# On Linux, show RAM utilization and virtual memory swap
free -h
\`\`\`

#### Detailed Lesson Content
Physical hardware security starts with understanding how the hardware operates. The CPU contains **registers** (extremely fast, byte-sized memory blocks), **L1/L2/L3 caches** (SRAM-based temporary data buffers), and interfaces directly with the system **RAM** (DRAM). Because RAM is volatile, power-cycling clears its contents, but forensics tools like \`Volatility\` can capture active RAM state to analyze volatile malware payloads before power-down. Permanent data is committed to non-volatile block devices like **Solid State Drives (SSDs)**, which use NAND flash gates.`,
          quiz: [
            {
              id: 'q-hw-1',
              question: 'Which of the following describes volatile memory?',
              options: [
                "Memory that loses stored data when power is removed (e.g., RAM)",
                "Read-only silicon memory chips storing low-level boot firmware",
                "Memory that retains stored data after a full power cycle (e.g., SSD)",
                "Optical disc media engineered for long-term cold offline archives"
              ],
              correctOption: 0,
              explanation: 'Volatile memory, such as DRAM or SRAM, requires active electrical currents to hold data; disconnecting power clears its memory cells.'
            },
            {
              id: 'q-hw-2',
              question: 'Where does the CPU store instruction data that is actively being executed at the lowest logical level?',
              options: [
                "BIOS flash memory",
                "Solid State Drive",
                "Virtual Memory Swap space",
                "CPU Registers"
              ],
              correctOption: 3,
              explanation: 'Registers are ultra-fast, local storage units built directly into the processor core to hold immediate execution inputs.'
            },
            {
              id: 'q-hw-3',
              question: 'What phase of the CPU instruction cycle translates binary machine instructions into actionable processor operations?',
              options: [
                "Fetch phase",
                "Decode phase",
                "Execute phase",
                "Writeback phase"
              ],
              correctOption: 1,
              explanation: 'The decode phase interprets the opcode (instruction prefix) and sets up the internal arithmetic logic units.'
            },
            {
              id: 'q-hw-4',
              question: 'Which hardware device uses NAND flash memory gates to read and write blocks of data electronically without moving parts?',
              options: [
                "BIOS microchip",
                "Hard Disk Drive (HDD)",
                "Solid State Drive (SSD)",
                "Dynamic Random Access Memory (DRAM)"
              ],
              correctOption: 2,
              explanation: 'SSDs use solid-state floating-gate transistors (NAND flash) to store data persistently without spinning mechanical platters.'
            }
          ]
        },
        {
          id: 'boot-os',
          title: 'System Boot & OS Architecture',
          description: 'Compare BIOS and UEFI boot modes, and dissect process models, scheduling, and file systems.',
          duration: '18 mins',
          content: `### System Boot & OS Architecture

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Computer Hardware, CPU, RAM & Storage  

#### Learning Objectives
- Compare traditional BIOS with modern UEFI architectures.
- Outline the differences between processes and threads.
- Deconstruct virtual memory management and file system structures.

#### Key Concepts
- **BIOS vs. UEFI:** UEFI replaces legacy BIOS, offering secure boot signatures, GUID Partition Tables (GPT), and mouse-supported GUI configuration.
- **Processes vs. Threads:** A process is an isolated address space; a thread is an execution unit sharing its parent process's memory.
- **Virtual Memory:** A translation mechanism maps physical RAM to a virtual address space using Page Tables and Swap partitions.
- **File Systems (NTFS vs. ext4):** Structures defining how metadata, files, and directories are stored and addressed on persistent disks.

#### Hands-On Lab: Process & Thread Inspection
Observe operating system resource allocation using the terminal:
\`\`\`bash
# On Linux, monitor active processes and CPU thread counts
htop

# Show file system disk space utilization
df -hT
\`\`\`

#### Detailed Lesson Content
When a system boots, the motherboard firmware executes first. In legacy systems, the **BIOS** reads sector 0 of the drive (the **Master Boot Record (MBR)**) to execute the primary bootloader. Modern systems use **UEFI**, which boots from an **EFI System Partition (ESP)** and supports **Secure Boot**, checking bootloader cryptographic signatures against trusted key databases to prevent rootkits. Once the OS kernel loads, it manages system resources, scheduling **processes** and handling **memory management** via virtual memory, swapping inactive pages to disk when physical RAM is exhausted.`,
          quiz: [
            {
              id: 'q-boot-1',
              question: 'Which feature of UEFI protects the system boot sequence by verifying cryptographic signatures of bootloaders and drivers?',
              options: [
                "GUID Partition Table (GPT)",
                "Secure Boot",
                "Virtual Memory Page translation",
                "Master Boot Record (MBR) validation"
              ],
              correctOption: 1,
              explanation: 'Secure Boot utilizes cryptographic certificates built into the UEFI firmware to authenticate loaders before allowing execution.'
            },
            {
              id: 'q-boot-2',
              question: 'What is the main distinction between a process and a thread?',
              options: [
                "Threads own isolated address spaces; processes share a common heap",
                "Processes execute strictly in user space; threads run in kernel space",
                "Processes cannot schedule concurrent worker threads on modern CPUs",
                "Processes use isolated memory; threads share parent process memory"
              ],
              correctOption: 3,
              explanation: 'A process is an isolated runtime environment with its own virtual memory space. Multiple threads execute concurrently inside that space, sharing its memory.'
            },
            {
              id: 'q-boot-3',
              question: 'Which file system is standard on modern Windows environments and supports file compression, encryption, and ACL security?',
              options: [
                "exFAT",
                "ext4",
                "NTFS",
                "FAT32"
              ],
              correctOption: 2,
              explanation: 'NTFS (New Technology File System) is Windows default filesystem, supporting modern permissions, transactions, and compression.'
            },
            {
              id: 'q-boot-4',
              question: 'What system components map virtual memory addresses to physical RAM blocks?',
              options: [
                "OS Page Tables and the CPU Memory Management Unit",
                "Real-mode BIOS interrupt descriptor table vector handlers",
                "UEFI Secure Boot signature verification database tables",
                "Legacy File Allocation Table directory cluster entries"
              ],
              correctOption: 0,
              explanation: 'The MMU uses hardware-level Page Tables managed by the OS kernel to map virtual program space to actual DRAM chips.'
            }
          ]
        },
        {
          id: 'virt-cloud-basics',
          title: 'Virtualization & Cloud Basics',
          description: 'Identify the foundations of bare-metal hypervisors and modern cloud deployment models.',
          duration: '15 mins',
          content: `### Virtualization & Cloud Basics

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** System Boot & OS Architecture  

#### Learning Objectives
- Define hypervisor-based virtualization.
- Describe Cloud service models (IaaS, PaaS, SaaS).
- Distinguish private, public, and hybrid cloud models.

#### Key Concepts
- **Hypervisor:** Software creating and running virtual machines by abstracting host CPU, memory, and devices.
- **IaaS (Infrastructure as a Service):** Access to raw virtualized compute, storage, and networking (e.g., AWS EC2).
- **PaaS (Platform as a Service):** Hosting environments with pre-managed runtimes, databases, and OS layers (e.g., Heroku).
- **SaaS (Software as a Service):** Complete application access via a web interface (e.g., Google Workspace).

#### Detailed Lesson Content
Virtualization uses a hypervisor layer to isolate guest hardware configurations from physical components. In the cloud, this abstraction is scaled globally. Cloud deployment models determine who owns and manages the security boundary:
- **Public Cloud:** Multi-tenant infrastructure managed by providers (AWS, Azure, GCP).
- **Private Cloud:** Single-tenant, dedicated corporate-owned hypervisor networks.
- **Hybrid Cloud:** Connected infrastructure combining private on-premises servers with public cloud scalability.`,
          quiz: [
            {
              id: 'q-vc-1',
              question: 'Which cloud service model provides access to raw virtual machines, networking adapters, and block storage devices?',
              options: [
                "Function as a Service (FaaS)",
                "Software as a Service (SaaS)",
                "Platform as a Service (PaaS)",
                "Infrastructure as a Service (IaaS)"
              ],
              correctOption: 3,
              explanation: 'IaaS provides basic building blocks like raw VM hosts, disks, and routing, leaving OS management and application installation to the customer.'
            },
            {
              id: 'q-vc-2',
              question: 'What is a multi-tenant cloud environment where virtualized resources are shared among multiple organizations over the public internet?',
              options: [
                "Public Cloud",
                "Private Cloud",
                "Hybrid Cloud",
                "On-premises Datacenter"
              ],
              correctOption: 0,
              explanation: 'Public Clouds host multiple client instances securely separated by hypervisors on a shared cloud architecture.'
            },
            {
              id: 'q-vc-3',
              question: 'Which hypervisor type runs directly on physical server hardware without an intermediary host operating system?',
              options: [
                "Container Engine",
                "Type 1 Bare-Metal Hypervisor",
                "Virtualization Emulator",
                "Type 2 Hosted Hypervisor"
              ],
              correctOption: 1,
              explanation: 'Type 1 hypervisors boot directly on physical server CPUs, maximizing virtual machine throughput and performance.'
            },
            {
              id: 'q-vc-4',
              question: 'In which Cloud model is an enterprise responsible for securing the application code but NOT the underlying operating system or database engine?',
              options: [
                "IaaS",
                "SaaS",
                "PaaS",
                "Bare-metal"
              ],
              correctOption: 2,
              explanation: 'PaaS (Platform as a Service) abstracts away operating systems, patching, and runtimes, allowing developers to focus solely on configuring application code.'
            }
          ]
        }
      ]
    },
    {
      id: 'networking',
      title: 'Networking Fundamentals',
      category: 'foundations',
      lessons: [
        {
          id: 'net-osi-tcp',
          title: 'Network Topologies, OSI & TCP/IP Reference models',
          description: 'Explore LAN, WAN, MAN networks, packet encapsulation, and structural OSI/TCPIP models.',
          duration: '15 mins',
          content: `### Network Topologies, OSI & TCP/IP Reference Models

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Classify network scopes (LAN, WAN, MAN, PAN).
- Explain data encapsulation down the 7-layer OSI model.
- Compare OSI layers with the collapsed 4-layer TCP/IP stack.

#### Key Concepts
- **LAN (Local Area Network):** A localized network spanning a single home, room, or building.
- **WAN (Wide Area Network):** Geographically distributed routing linking multiple LANs (e.g., the Internet).
- **OSI Model:** Structural framework detailing system-to-system data exchange.
- **Encapsulation:** Wrapping control headers around data as it travels down network layers.

#### Hands-On Lab: Encapsulation Traversal
Inspect packet headers and paths on live networks:
\`\`\`bash
# Trace connection hops to an external host
traceroute 1.1.1.1

# Print local network adapters, link states, and MAC/IP allocations
ip addr show
\`\`\`

#### Detailed Lesson Content
Data travel requires precise organization. As data moves down the OSI reference model:
1. **Application Payload** (HTTP/DNS data) is sent from the Application Layer.
2. It is encapsulated with a TCP or UDP header at the **Transport Layer**, becoming a **Segment** (using port identifiers).
3. The **Network Layer** adds source/destination logical IP headers, creating a **Packet**.
4. The **Data Link Layer** appends physical MAC headers, forming a **Frame**.
5. Finally, the **Physical Layer** encodes the frame into raw **Bits** transmitted as electrical, optical, or RF pulses.`,
          quiz: [
            {
              id: 'q-netosi-1',
              question: 'What structural unit is created at the Data Link Layer when logical network packets are encapsulated with source and destination MAC address headers?',
              options: [
                "Frame",
                "Bitstream",
                "Segment",
                "Packet"
              ],
              correctOption: 0,
              explanation: 'The Data Link layer formats data packets into "Frames" containing MAC addresses, physical link parameters, and error-checking trailers.'
            },
            {
              id: 'q-netosi-2',
              question: 'Which network scope covers a localized residential building, office department, or laboratory space?',
              options: [
                "PAN (Personal Area Network)",
                "WAN (Wide Area Network)",
                "LAN (Local Area Network)",
                "MAN (Metropolitan Area Network)"
              ],
              correctOption: 2,
              explanation: 'LANs connect close computing resources via physical switches, local routers, or wireless access points.'
            },
            {
              id: 'q-netosi-3',
              question: 'Which TCP/IP Layer maps directly to the OSI model\'s Layers 5, 6, and 7?',
              options: [
                "Transport Layer",
                "Link Layer",
                "Internet Layer",
                "Application Layer"
              ],
              correctOption: 3,
              explanation: 'The TCP/IP model simplifies architecture, combining Session (L5), Presentation (L6), and Application (L7) into a unified Application layer.'
            },
            {
              id: 'q-netosi-4',
              question: 'As network traffic descends the OSI model stack, what is the term used to describe the process of enclosing payload data with control headers?',
              options: [
                "Segmentation",
                "Encapsulation",
                "De-encapsulation",
                "Fragmentation"
              ],
              correctOption: 1,
              explanation: 'Encapsulation is the sequential wrapping of protocol headers and trailers around payload data at each level of the network stack.'
            }
          ]
        },
        {
          id: 'ip-subnetting',
          title: 'IP Addressing & Subnetting',
          description: 'Dive deep into IPv4, IPv6, logical subnetting, and CIDR block configuration.',
          duration: '20 mins',
          content: `### IP Addressing & Subnetting

**Difficulty:** Medium  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Network Topologies, OSI & TCP/IP Reference models  

#### Learning Objectives
- Analyze differences between IPv4 and IPv6 layouts.
- Perform binary subnet calculations.
- Read CIDR network notation blocks.

#### Key Concepts
- **IPv4 Address:** 32-bit logical address (e.g., \`192.168.1.5\`) divided into four octets.
- **IPv6 Address:** 128-bit hexadecimal address resolving routing exhaustion.
- **Subnet Mask:** Defines which bits represent the Network identifier vs. Host identifiers.
- **CIDR (Classless Inter-Domain Routing):** Flexible network notation using slash routing prefixes (e.g., \`/24\`).

#### Hands-On Lab: Subnet Auditing
Calculate network address footprints using utility commands:
\`\`\`bash
# Calculate network scopes, broadcast addresses, and host pools
ipcalc 192.168.10.0/26
\`\`\`

#### Detailed Lesson Content
Subnetting divides a massive network into smaller, isolated logical segments to improve routing efficiency and contain network compromise.
A standard \`/24\` CIDR block allocates 24 bits to the network identifier (Subnet Mask \`255.255.255.0\`), leaving 8 bits for host addresses ($2^8 = 256$ addresses, minus 2 for network ID and broadcast ID, yielding 254 usable host addresses). A \`/26\` block allocates 26 network bits, dividing the classful block into segments of 64 addresses (62 usable hosts).`,
          quiz: [
            {
              id: 'q-sub-1',
              question: 'How many usable host IP addresses are available on a local subnet with a CIDR notation of /24?',
              options: [
                "256",
                "128",
                "254",
                "512"
              ],
              correctOption: 2,
              explanation: 'A /24 block provides 256 total addresses ($2^8$). Since the first (Network ID) and last (Broadcast ID) addresses are reserved, 254 are usable.'
            },
            {
              id: 'q-sub-2',
              question: 'Which of the following is a valid IPv6 host logical address representation?',
              options: [
                "192.168.1.1",
                "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
                "FF:3E:4D:21:AC:88",
                "10.256.0.1"
              ],
              correctOption: 1,
              explanation: 'IPv6 uses a 128-bit structure formatted as eight groups of four hexadecimal digits separated by colons.'
            },
            {
              id: 'q-sub-3',
              question: 'What is the binary subnet mask corresponding to a /26 CIDR network prefix?',
              options: [
                "255.255.255.240",
                "255.255.255.0",
                "255.255.255.128",
                "255.255.255.192"
              ],
              correctOption: 3,
              explanation: 'A /26 mask has 26 high bits set to 1. The last octet is binary "11000000", which converts to decimal 192.'
            },
            {
              id: 'q-sub-4',
              question: 'What is the primary function of a Subnet Mask?',
              options: [
                "To separate the Network ID bits from the Host ID bits",
                "To establish encrypted site-to-site VPN tunnel sessions",
                "To translate domain hostnames into numeric IPv4/IPv6 addresses",
                "To burn static hardware MAC addresses onto network cards"
              ],
              correctOption: 0,
              explanation: 'The subnet mask uses bitwise operations to extract the network ID, enabling routers to direct traffic to appropriate logical rings.'
            }
          ]
        },
        {
          id: 'infra-protocols',
          title: 'Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)',
          description: 'Master name resolution, address assignment, network translations, and host scanning.',
          duration: '18 mins',
          content: `### Infrastructure Protocols

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** IP Addressing & Subnetting  

#### Learning Objectives
- Map hostname lookups via DNS.
- Audit dynamic network assignment with DHCP.
- Match MAC-to-IP physical bindings with ARP.

#### Key Concepts
- **DNS (Domain Name System):** Resolves human-readable domain names to logical IP addresses (UDP Port 53).
- **DHCP (Dynamic Host Configuration Protocol):** Automatically leases IP addresses, default gateways, and DNS settings to local network clients (UDP Ports 67/68).
- **NAT (Network Address Translation):** Maps private RFC 1918 networks to a single public routing IP on the WAN.
- **ARP (Address Resolution Protocol):** Resolves logical IP addresses to physical Layer 2 MAC addresses.
- **ICMP (Internet Control Message Protocol):** Handles system status diagnostics, ping diagnostics, and routing feedback.

#### Hands-On Lab: Protocol Diagnostics
Utilize diagnostic utilities to analyze local bindings:
\`\`\`bash
# Lookup IP information for a domain target
dig +trace cyberfoundations.org

# View active MAC-to-IP resolution tables
arp -a

# Send ICMP echo requests to verify remote hosts
ping -c 4 8.8.8.8
\`\`\`

#### Detailed Lesson Content
Network architectures rely on dynamic service helpers. **DHCP** uses the DORA sequence (Discover, Offer, Request, Acknowledge) to assign network parameters. Once a system has an IP, it needs to contact neighboring nodes; **ARP** broadcasts queries requesting the physical **MAC address** of the target. When querying names outside the LAN, **DNS** traverses Root, TLD, and Authoritative servers to resolve domain zones, making DNS caches high-value targets for attackers seeking hijack points (DNS cache poisoning).`,
          quiz: [
            {
              id: 'q-inf-1',
              question: 'Which protocol translates a destination\'s logical IP address into its physical Layer 2 MAC address on local subnets?',
              options: [
                "DHCP",
                "NAT",
                "ARP",
                "DNS"
              ],
              correctOption: 2,
              explanation: 'ARP (Address Resolution Protocol) maps dynamic Layer 3 logical IP addresses directly to physical network adapters.'
            },
            {
              id: 'q-inf-2',
              question: 'Which port and transport protocol are primarily used for standard Domain Name System (DNS) query resolution?',
              options: [
                "UDP Port 67",
                "TCP Port 443",
                "TCP Port 53",
                "UDP Port 53"
              ],
              correctOption: 3,
              explanation: 'DNS resolutions use quick, low-overhead UDP packets on Port 53 to achieve rapid lookups.'
            },
            {
              id: 'q-inf-3',
              question: 'What is the correct sequence of messages exchanged in a standard DHCP client-server IP lease handshake?',
              options: [
                "Request, Lease, Accept, Finish exchange",
                "Discover, Offer, Request, Acknowledge (DORA)",
                "SYN, SYN-ACK, ACK, Keep-Alive sequence",
                "Query, Response, Verify, Complete handshake"
              ],
              correctOption: 1,
              explanation: 'DHCP uses the DORA sequence: client broadcasts Discover, server responds with Offer, client requests parameters, and server sends dynamic lease Acknowledge.'
            },
            {
              id: 'q-inf-4',
              question: 'Which protocol is responsible for mapping internal private RFC 1918 subnets to a public external WAN address to conserve IP pools?',
              options: [
                "NAT",
                "ARP",
                "DHCP",
                "ICMP"
              ],
              correctOption: 0,
              explanation: 'NAT (Network Address Translation) alters packet headers to share a single public IP among hundreds of internal enterprise devices.'
            }
          ]
        },
        {
          id: 'transport-protocols',
          title: 'Transport Protocols & Port Bindings',
          description: 'Compare connection-oriented TCP and connectionless UDP, and identify high-yield ports.',
          duration: '15 mins',
          content: `### Transport Protocols & Port Bindings

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Infrastructure Protocols  

#### Learning Objectives
- Diagram the TCP 3-way handshake and teardown sequences.
- Contrast the performance profiles of TCP and UDP.
- Match standard services to their designated port bindings.

#### Key Concepts
- **TCP (Transmission Control Protocol):** Connection-oriented, guaranteed, ordered packet delivery with flow control.
- **UDP (User Datagram Protocol):** Connectionless, lightweight, low-overhead stream delivery.
- **TCP Three-Way Handshake:** Connection initialization process: \`SYN\` -> \`SYN-ACK\` -> \`ACK\`.
- **System Ports (0-65535):** Logical addressing channels separating concurrent application streams.

#### Hands-On Lab: Listening Port Inspection
Audit active network ports on your machine:
\`\`\`bash
# On Linux, list active listening TCP/UDP ports and system process IDs
sudo ss -tuln -p
\`\`\`

#### Detailed Lesson Content
The Transport Layer routes multiple application flows across physical links. **TCP** provides reliable delivery using sequence numbers and acknowledgment structures, establishing sessions via a **3-way handshake**. Conversely, **UDP** streams data without connection state, making it ideal for streaming, gaming, and real-time DNS queries. System ports are grouped into:
- Well-Known Ports (0-1023): Restrictive services (SSH, HTTP, HTTPS).
- Registered Ports (1024-49151): Custom servers (database channels like MySQL on Port 3306).
- Dynamic/Private Ports (49152-65535): Ephemeral outbound sockets.`,
          quiz: [
            {
              id: 'q-tp-1',
              question: 'Which three flags are set, in correct chronological order, during a successful TCP three-way connection handshake?',
              options: [
                "SYN -> ACK -> RST",
                "SYN -> SYN-ACK -> ACK",
                "PSH -> ACK -> FIN",
                "SYN -> PSH -> ACK"
              ],
              correctOption: 1,
              explanation: 'The client sends a SYN packet, the server responds with a combined SYN-ACK, and the client returns an ACK to establish the session.'
            },
            {
              id: 'q-tp-2',
              question: 'Why would an application choose UDP (User Datagram Protocol) over TCP?',
              options: [
                "To enable low-latency streaming without connection setup overhead",
                "To guarantee error-free, strictly ordered packet delivery",
                "To enforce symmetric payload encryption on every datagram",
                "To track automatic packet retransmission timers per session"
              ],
              correctOption: 0,
              explanation: 'UDP lacks flow-control, acknowledgments, or handshakes, providing lightweight execution suited for real-time video, audio, or quick DNS checks.'
            },
            {
              id: 'q-tp-3',
              question: 'Which default port and protocol binding is utilized for secure command-line shell administration (SSH)?',
              options: [
                "Port 80 / TCP",
                "Port 21 / TCP",
                "Port 23 / UDP",
                "Port 22 / TCP"
              ],
              correctOption: 3,
              explanation: 'Secure Shell (SSH) runs by default over secure TCP Port 22 to provide reliable console administration.'
            },
            {
              id: 'q-tp-4',
              question: 'Which port matches standard secure HTTP traffic (HTTPS)?',
              options: [
                "Port 25",
                "Port 80",
                "Port 443",
                "Port 8080"
              ],
              correctOption: 2,
              explanation: 'Port 443 handles secure web traffic over SSL/TLS, while unencrypted HTTP runs over Port 80.'
            }
          ]
        },
        {
          id: 'switching-routing',
          title: 'Routing, Switching & VLANs',
          description: 'Examine Layer 2 bridging, Layer 3 routing tables, and logical broadcast domain separation.',
          duration: '15 mins',
          content: `### Routing, Switching & VLANs

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Transport Protocols & Port Bindings  

#### Learning Objectives
- Analyze Layer 2 switching mechanics using MAC tables.
- Trace Layer 3 routing decisions.
- Configure logical broadcast separation via VLANs.

#### Key Concepts
- **Switching (Layer 2):** Forwards frames inside a LAN using a **CAM (Content Addressable Memory)** MAC address table.
- **Routing (Layer 3):** Forwards packets between disparate subnets using logical routing tables.
- **VLANs (Virtual Local Area Networks):** Partitions a physical switch into multiple isolated logical networks at Layer 2.

#### Detailed Lesson Content
Local network performance relies on hardware isolation. A Layer 2 **Switch** maps MAC addresses to physical ports to limit collision domains. However, all ports on a standard switch share a single broadcast domain. **VLANs** solve this by grouping switch ports logically; broadcast traffic from one VLAN never leaks into another without a Layer 3 **Router** (Inter-VLAN routing), containing broadcast traffic and preventing network sniffing attacks.`,
          quiz: [
            {
              id: 'q-sr-1',
              question: 'Which database is used by a Layer 2 switch to match physical MAC addresses to physical switch ports?',
              options: [
                "Layer 3 static routing table",
                "CAM / MAC Address table",
                "Authoritative DNS zone file",
                "Local gateway ARP cache"
              ],
              correctOption: 1,
              explanation: 'CAM (Content Addressable Memory) tables match hardware MAC addresses to specific switch ports to optimize packet delivery.'
            },
            {
              id: 'q-sr-2',
              question: 'What is the primary security benefit of implementing Virtual Local Area Networks (VLANs)?',
              options: [
                "They automatically encrypt all local Ethernet frames across ports.",
                "They inspect and strip malicious payloads from incoming HTTP flows.",
                "They partition physical switches into isolated logical broadcast domains.",
                "They lease static public IPv4 addresses directly to client endpoints."
              ],
              correctOption: 2,
              explanation: 'VLANs isolate network segments at Layer 2, preventing unauthorized hosts on one VLAN from sniffing or accessing traffic on other segments without router inspection.'
            },
            {
              id: 'q-sr-3',
              question: 'At which layer of the OSI model does logical packet routing between different subnets occur?',
              options: [
                "Layer 2 (Data Link)",
                "Layer 4 (Transport)",
                "Layer 1 (Physical)",
                "Layer 3 (Network)"
              ],
              correctOption: 3,
              explanation: 'Routers operate at Layer 3 (Network), using logical IP address headers to forward traffic between disparate subnets.'
            },
            {
              id: 'q-sr-4',
              question: 'What happens when a switch receives a unicast frame with a destination MAC address not present in its CAM table?',
              options: [
                "The switch floods the frame out all other ports in that VLAN.",
                "The switch returns an ICMP Destination Unreachable reply packet.",
                "The switch queries an upstream authoritative DNS resolver server.",
                "The switch silently discards the Ethernet frame without logging."
              ],
              correctOption: 0,
              explanation: 'When a unicast destination MAC is unknown, the switch floods the frame out of all ports on that VLAN to find the target device.'
            }
          ]
        },
        {
          id: 'vpn-firewalls',
          title: 'Secure Tunnels & Perimeter Defense (VPN, Firewalls, Proxy Servers)',
          description: 'Deploy stateful packet filters, forward/reverse proxy servers, and encrypted site tunnels.',
          duration: '18 mins',
          content: `### Secure Tunnels & Perimeter Defense

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Routing, Switching & VLANs  

#### Learning Objectives
- Compare stateful and stateless firewall rules.
- Contrast Forward and Reverse proxy servers.
- Detail the benefits of encrypted VPN tunnels.

#### Key Concepts
- **Firewall:** A software or hardware device that filters inbound/outbound traffic based on defined security rules.
- **Stateful Packet Inspection (SPI):** Firewalls that track the state of active network connections (e.g., verifying that incoming traffic belongs to an existing session).
- **Forward Proxy:** Positioned on the client side to control, filter, and anonymize outbound internet access.
- **Reverse Proxy:** Positioned on the server side to handle load balancing, TLS termination, and caching.
- **VPN (Virtual Private Network):** Establishes encrypted tunnels over public networks (IPsec, OpenVPN, WireGuard).

#### Hands-On Lab: Basic Firewall Rules
Examine host packet filtering rules using standard tools:
\`\`\`bash
# On modern Linux systems using nftables
sudo nft list ruleset

# Or inspect legacy iptables rules
sudo iptables -L -n -v
\`\`\`

#### Detailed Lesson Content
Defending network boundaries requires perimeter security. **Stateful Firewalls** track the context of active sessions; if an external host sends an unsolicited packet, it is dropped unless it matches an existing connection record. **Reverse Proxies** protect backend web infrastructure from direct internet exposure, acting as an intermediary that handles secure SSL handshakes and scrubs incoming requests, while **VPNs** extend corporate network boundaries securely over untrusted public connections.`,
          quiz: [
            {
              id: 'q-vf-1',
              question: 'What is the core feature of a Stateful Packet Inspection (SPI) firewall?',
              options: [
                "It decrypts and re-signs all high-level TLS application payloads.",
                "It balances client HTTP requests across physical backend clusters.",
                "It tracks active connection state to match replies to requests.",
                "It filters traffic solely using static source/destination IP rules."
              ],
              correctOption: 2,
              explanation: 'Stateful firewalls maintain a state table of current connection contexts, allowing them to drop unsolicited inbound packets that do not belong to an active session.'
            },
            {
              id: 'q-vf-2',
              question: 'Which proxy configuration is positioned directly in front of backend web servers to handle load balancing, caching, and SSL/TLS decryption?',
              options: [
                "SOCKS5 Proxy",
                "Transparent Proxy",
                "Forward Proxy",
                "Reverse Proxy"
              ],
              correctOption: 3,
              explanation: 'A Reverse Proxy acts as the gateway for external web requests, shielding backend application clusters from direct public access.'
            },
            {
              id: 'q-vf-3',
              question: 'Which modern, lightweight VPN protocol is built directly into the Linux kernel and uses advanced cryptography (Noise framework, ChaCha20)?',
              options: [
                "WireGuard",
                "PPTP",
                "L2TP/IPsec",
                "SSL v3"
              ],
              correctOption: 0,
              explanation: 'WireGuard is a highly efficient, fast, modern VPN protocol implemented natively inside modern Linux operating system kernels.'
            },
            {
              id: 'q-vf-4',
              question: 'Which firewall rule design strategy blocks all traffic by default and only allows explicitly whitelisted packets?',
              options: [
                "Stateful Bypass",
                "Implicit Deny",
                "Dynamic Forwarding",
                "Implicit Allow"
              ],
              correctOption: 1,
              explanation: 'An Implicit Deny posture is the foundation of Zero-Trust security; everything is blocked unless explicitly permitted by an active rule.'
            }
          ]
        }
      ]
    },
    {
      id: 'linux-mastery',
      title: 'Linux Administration',
      category: 'foundations',
      lessons: [
        {
          id: 'lin-fs',
          title: 'Linux Installation & File System',
          description: 'Install Linux, and explore system mount points, partition trees, and device drivers.',
          duration: '15 mins',
          content: `### Linux Installation & File System

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Navigate the Linux file system hierarchy.
- Identify the purpose of high-yield root folders.
- Mount and inspect physical storage partitions.

#### Key Concepts
- **Root Directory (\`/\`):** The top-level folder of the unified Linux file directory.
- **FHS (Filesystem Hierarchy Standard):** The structural standard defining folder purposes.
- **Mounting:** Attaching a physical partition or network resource to a target directory in the file tree.

#### Hands-On Lab: Directory Navigation
Deconstruct system directories and mount volumes using terminal commands:
\`\`\`bash
# Print current directory location
pwd

# List contents of root system configuration directory
ls -la /etc

# Show active mounted disks and partitions
mount | grep '^/dev'
\`\`\`

#### Detailed Lesson Content
Unlike Windows, which uses drive letters (e.g., \`C:\\\`), Linux organizes all devices, partitions, and storage volumes under a single unified **Root Directory (\`/\`)**. Under this structure, high-yield system folders include:
- \`/etc\`: Statically configured system and application settings.
- \`/bin\`, \`/sbin\`: Core administrative execution files.
- \`/var\`: Variable data logs, mail indexes, and active service state.
- \`/dev\`: Logical file representations of hardware devices (e.g., \`/dev/sda1\`).
- \`/proc\`: A pseudo-filesystem exposing real-time kernel memory and active processes.`,
          quiz: [
            {
              id: 'q-lfs-1',
              question: 'In the Linux Filesystem Hierarchy Standard (FHS), which directory holds system configuration files and parameters?',
              options: [
                "/etc",
                "/proc",
                "/bin",
                "/var"
              ],
              correctOption: 0,
              explanation: '/etc is the central repository for text-based system and network configuration files.'
            },
            {
              id: 'q-lfs-2',
              question: 'Which directory houses virtual files representing hardware components and storage blocks like hard drives?',
              options: [
                "/mnt",
                "/dev",
                "/var",
                "/sys"
              ],
              correctOption: 1,
              explanation: '/dev contains virtual representations of connected devices, allowing the OS to read/write hardware as standard stream files.'
            },
            {
              id: 'q-lfs-3',
              question: 'What is the command used on Linux to attach a raw drive partition to a target folder in the file hierarchy?',
              options: [
                "attach",
                "bind",
                "map",
                "mount"
              ],
              correctOption: 3,
              explanation: 'The "mount" command binds physical disk partitions to structural target folders in the root filesystem.'
            },
            {
              id: 'q-lfs-4',
              question: 'Which pseudo-filesystem directory exposes real-time kernel statistics and process-specific details directly from memory?',
              options: [
                "/etc",
                "/usr",
                "/proc",
                "/opt"
              ],
              correctOption: 2,
              explanation: '/proc is generated dynamically in RAM, acting as a gateway for inspecting kernel state, memory maps, and process statuses.'
            }
          ]
        },
        {
          id: 'lin-permissions',
          title: 'Access Control & Permissions (chmod, chown, sudo)',
          description: 'Harden file systems, translate octal permissions, and manage root system privileges.',
          duration: '18 mins',
          content: `### Access Control & Permissions

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Linux Installation & File System  

#### Learning Objectives
- Decode Linux permissions masks (\`rwxrwxrwx\`).
- Apply numeric permissions masks using \`chmod\`.
- Manage group structures and adjust file owners via \`chown\`.
- Configure privileged access rules using \`sudo\`.

#### Key Concepts
- **Permissions Bits:** Nine bits specifying Read (\`r=4\`), Write (\`w=2\`), and Execute (\`x=1\`) permissions across Owner, Group, and Others.
- **chmod:** Updates file and directory access control masks.
- **chown:** Assigns file ownership to users and groups.
- **sudo:** Executes commands with elevated root execution privileges.

#### Hands-On Lab: Hardening Permissions
Apply secure access parameters in your terminal workspace:
\`\`\`bash
# Set owner permissions to read/write, and block all other access (600)
chmod 600 id_rsa

# Assign script ownership to user 'secops' and group 'admin'
sudo chown secops:admin launch_scanner.sh

# List active permission bits and owner context of files
ls -lh launch_scanner.sh
\`\`\`

#### Detailed Lesson Content
Linux access controls are simple and strict. Every file belongs to a specific user owner and group. Running \`ls -l\` outputs metadata with access masks (e.g., \`-rwxr-xr-x\`). The leading character indicates type (\`-\` for file, \`d\` for directory). The subsequent 9 characters are grouped into:
- Owner (first 3): \`rwx\` (Read, Write, Execute).
- Group (middle 3): \`r-x\` (Read, Execute).
- Others (last 3): \`r-x\` (Read, Execute).

Converting these bits to octal values simplifies management: \`r=4\`, \`w=2\`, \`x=1\`. Therefore, \`rwxr-xr-x\` equals octal **755** ($4+2+1=7$; $4+0+1=5$; $4+0+1=5$). Standard practice for private keys (e.g., SSH keys) requires restriction to octal **600** (Read/Write for owner only).`,
          quiz: [
            {
              id: 'q-lp-1',
              question: 'Which of the following octal permissions corresponds to setting a file as Read/Write for owner, and denying all access to Group and Others?',
              options: [
                "644",
                "600",
                "777",
                "755"
              ],
              correctOption: 1,
              explanation: '600 equates to owner: Read(4)+Write(2)=6; group: 0; others: 0. This restricts sensitive files like SSH keys from unauthorized inspection.'
            },
            {
              id: 'q-lp-2',
              question: 'What is the command used to modify the administrative owner and group of a file on Linux?',
              options: [
                "setfacl",
                "chmod",
                "chown",
                "chattr"
              ],
              correctOption: 2,
              explanation: 'chown (Change Owner) is used to modify the administrative owner and/or group assigned to a target file.'
            },
            {
              id: 'q-lp-3',
              question: 'What character indicates a folder or directory when reading permissions output from ls -la?',
              options: [
                "d",
                "l",
                "s",
                "-"
              ],
              correctOption: 0,
              explanation: 'A "d" at the start of the permission block indicates that the entry is a directory.'
            },
            {
              id: 'q-lp-4',
              question: 'Where is the configuration file located that defines which users are authorized to run commands using sudo privileges?',
              options: [
                "/etc/shadow",
                "/var/log/secure",
                "/etc/passwd",
                "/etc/sudoers"
              ],
              correctOption: 3,
              explanation: 'The "/etc/sudoers" file defines root elevation policies and access rules, and should always be edited using the "visudo" command.'
            }
          ]
        },
        {
          id: 'bash-scripting',
          title: 'Bash Shell & Core Scripting',
          description: 'Automate manual system operations, capture environment variables, and build robust Bash scripts.',
          duration: '20 mins',
          content: `### Bash Shell & Core Scripting

**Difficulty:** Medium  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Access Control & Permissions  

#### Learning Objectives
- Run interactive shell scripts in bash.
- Set environment variables.
- Write scripts containing loops, logical expressions, and process tracking.

#### Key Concepts
- **Shebang (\`#!/bin/bash\`):** Tells the kernel which shell interpreter to use for the script.
- **Variables:** Holds runtime strings or configurations (e.g., \`TARGET="10.10.10.1"\`).
- **Loops:** Repeats blocks of code (e.g., iterating through an IP pool).
- **Conditionals:** Directs code flow based on expressions (e.g., \`if\`, \`then\`).

#### Hands-On Lab: Custom Port Scanner
Create a quick, native ping sweep script in your workspace:
\`\`\`bash
# Create a local test script file
cat << 'EOF' > sweep.sh
#!/bin/bash
subnet="192.168.1"
for ip in {1..254}; do
  ping -c 1 -W 1 "$subnet.$ip" > /dev/null 2>&1 && echo "Host $subnet.$ip is UP" &
done
wait
EOF

# Grant execution rights and run
chmod +x sweep.sh
./sweep.sh
\`\`\`

#### Detailed Lesson Content
Bash (Bourne Again Shell) is the command execution environment on most Linux installations. Mastering scripting enables security analysts to automate log collection, triage host compromises, and script rapid response actions. Bash scripts require the shebang line (\`#!/bin/bash\`) as their first line, and use standard Unix utilities for fast text parsing.`,
          quiz: [
            {
              id: 'q-bs-1',
              question: 'What is the purpose of the shebang line (#!/bin/bash) placed at the very top of a Linux script?',
              options: [
                "It launches the script immediately as a detached background daemon.",
                "It symmetrically encrypts the script body before disk storage.",
                "It tells the kernel which interpreter binary executes the script.",
                "It automatically elevates execution to root sudo privileges."
              ],
              correctOption: 2,
              explanation: 'The shebang specifies the absolute path of the interpreter binary (such as bash) that should execute the script file.'
            },
            {
              id: 'q-bs-2',
              question: 'Which syntax represents the correct variable assignment structure in Bash?',
              options: [
                "set target to \"10.0.0.1\"",
                "target=\"10.0.0.1\"",
                "target := \"10.0.0.1\"",
                "target = \"10.0.0.1\""
              ],
              correctOption: 1,
              explanation: 'Bash variable assignments must NOT contain spaces around the equal sign (e.g., variable=value).'
            },
            {
              id: 'q-bs-3',
              question: 'Which control statement is used to execute a block of code repeatedly while iterating through a list of values?',
              options: [
                "until",
                "if",
                "case",
                "for"
              ],
              correctOption: 3,
              explanation: 'The "for" loop in Bash is used to iterate over lists of values, array indexes, or directory files.'
            },
            {
              id: 'q-bs-4',
              question: 'What is the output of the variable syntax $? in a Bash shell session?',
              options: [
                "The exit status code of the last executed command",
                "The numeric process ID (PID) of the current shell",
                "The username of the currently logged-in session",
                "The positional array of passed script arguments"
              ],
              correctOption: 0,
              explanation: '$? prints the exit status of the previous command. A value of 0 indicates success, while any non-zero value indicates an error code.'
            }
          ]
        },
        {
          id: 'lin-logfiltering',
          title: 'Stream Editing & File Inspection (grep, find, awk, sed)',
          description: 'Extract, clean, and filter massive text files and system logs using pipeline utilities.',
          duration: '22 mins',
          content: `### Stream Editing & File Inspection

**Difficulty:** Medium  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Bash Shell & Core Scripting  

#### Learning Objectives
- Locate system files using \`find\`.
- Filter logs using \`grep\`.
- Reformat and parse text data tables using \`awk\`.
- Perform inline text replacements with \`sed\`.

#### Key Concepts
- **grep:** Regex-driven command line utility that searches for lines matching a pattern.
- **find:** Searches for files in the directory tree matching size, type, or permission parameters.
- **awk:** A powerful, column-oriented text parsing language.
- **sed:** Stream editor used to perform search-and-replace transformations on input text streams.

#### Hands-On Lab: Parsing Server Logs
Parse failed logins from mock log profiles:
\`\`\`bash
# Find files in /var/log/ ending in '.log'
find /var/log/ -type f -name "*.log"

# Search for SSH password failures and extract source IPs using awk
echo "Jul 17 09:20:10 srv sshd[1204]: Failed password for root from 192.168.1.150 port 49152 ssh2" | grep "Failed password" | awk '{print $11}'
\`\`\`

#### Detailed Lesson Content
Log analysis requires high-performance text manipulation. Chaining utilities using the **pipe (\`|\`)** operator allows you to process massive system logs quickly.
- \`grep -i "error" /var/log/syslog\`: Finds all log entries matching the word "error" (case-insensitive).
- \`awk '{print $1, $5}'\`: Extracts and prints column 1 and column 5 from a space-separated log file.
- \`sed 's/sensitive_data/REDACTED/g'\`: Replaces sensitive terms across an entire text file stream.`,
          quiz: [
            {
              id: 'q-lf-1',
              question: 'Which awk argument structure prints only the first and fourth space-separated columns from an input text file?',
              options: [
                "awk '{cat $1; cat $4}'",
                "awk '{print column[1,4]}'",
                "awk -f 1,4",
                "awk '{print $1, $4}'"
              ],
              correctOption: 3,
              explanation: 'awk parses fields using spaces as the default separator, referencing columns using dollar sign variables (e.g., $1, $4).'
            },
            {
              id: 'q-lf-2',
              question: 'Which sed command correctly replaces all occurrences of the word "HTTP" with "HTTPS" in a file called config.txt?',
              options: [
                "sed \"replace/HTTP/HTTPS\" config.txt",
                "sed -r \"HTTP\" to \"HTTPS\" config.txt",
                "sed \"s/HTTP/HTTPS/g\" config.txt",
                "sed \"HTTP/HTTPS\" config.txt"
              ],
              correctOption: 2,
              explanation: 'The substitute syntax "s/pattern/replacement/g" tells sed to replace all matches of the pattern across the input stream.'
            },
            {
              id: 'q-lf-3',
              question: 'Which command searches the entire file system for files larger than 100MB?',
              options: [
                "find / -type f -size +100M",
                "ls -lh / --size 100M",
                "grep -r \"+100M\" /",
                "locate -s 100M /"
              ],
              correctOption: 0,
              explanation: 'The "find" command utilizes the "-type f" and "-size +100M" flags to locate large files within the filesystem tree.'
            },
            {
              id: 'q-lf-4',
              question: 'Which grep option is used to show five lines of context AFTER each matched pattern line?',
              options: [
                "-C 5",
                "-A 5",
                "-x 5",
                "-B 5"
              ],
              correctOption: 1,
              explanation: 'The "-A 5" flag (After) prints the matched line along with the next 5 lines of context, which is useful when analyzing surrounding log details.'
            }
          ]
        },
        {
          id: 'lin-services',
          title: 'Archiving & System Services (tar, gzip, cron, systemctl, journalctl)',
          description: 'Package system files, schedule repetitive jobs with cron, and manage systemd service daemons.',
          duration: '18 mins',
          content: `### Archiving & System Services

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Stream Editing & File Inspection  

#### Learning Objectives
- Create and extract compressed archives using \`tar\`.
- Schedule automated scripts using system \`cron\` tables.
- Control system services using \`systemctl\`.
- Query consolidated system logs via \`journalctl\`.

#### Key Concepts
- **tar:** Combines multiple files and folders into a single archive file (often compressed using gzip).
- **cron:** Background scheduling daemon executing scheduled shell commands.
- **systemd:** The initial process (PID 1) that boots the user-space environment and controls system services.
- **journalctl:** Query utility for inspecting logs collected by the systemd logging daemon.

#### Hands-On Lab: Service Auditing
Configure and analyze systemd services and cron schedules:
\`\`\`bash
# Compress the system log archive folder
tar -czvf logs_backup.tar.gz /var/log

# Monitor the Apache web server service status
sudo systemctl status apache2

# Stream live system log updates matching a specific service
sudo journalctl -u ssh -f
\`\`\`

#### Detailed Lesson Content
Managing production servers requires standard service auditing. Modern Linux systems use **systemd** to manage services, allowing you to start, stop, restart, enable (start on boot), or disable services using **systemctl**. Consolidated log data is recorded in binary format by **journald**, which is queried using **journalctl**. To automate administrative tasks like log rotational backups, you can add scheduled tasks to the system **crontab** (\`/etc/crontab\`).`,
          quiz: [
            {
              id: 'q-lsv-1',
              question: 'Which systemctl subcommand configures a service daemon to start automatically when the server boots up?',
              options: [
                "systemctl systemd <service>",
                "systemctl start <service>",
                "systemctl enable <service>",
                "systemctl boot <service>"
              ],
              correctOption: 2,
              explanation: '"systemctl enable" creates the necessary symlinks under systemd targets to launch the service during the OS boot sequence.'
            },
            {
              id: 'q-lsv-2',
              question: 'What is the syntax used in crontab scheduling to execute a script every single hour of every day?',
              options: [
                "0 * * * * /path/script.sh",
                "* * * * * /path/script.sh",
                "hourly /path/script.sh",
                "0 0 * * * /path/script.sh"
              ],
              correctOption: 0,
              explanation: '"0 * * * *" executes a cron job when the minute field is 0 (i.e. once an hour), while leaving the remaining fields as wildcards.'
            },
            {
              id: 'q-lsv-3',
              question: 'Which tar flags are combined to create a gzip-compressed archive file?',
              options: [
                "-cvf",
                "-czvf",
                "-uvf",
                "-xzvf"
              ],
              correctOption: 1,
              explanation: '"-czvf" translates to: Create (-c), compress with gzip (-z), verbose file naming output (-v), writing to file archive name (-f).'
            },
            {
              id: 'q-lsv-4',
              question: 'Which command queries real-time, streaming systemd logs for the SSH security daemon?',
              options: [
                "tail -f /var/log/secure",
                "systemctl ssh logs",
                "grep -r \"ssh\" /proc",
                "journalctl -u ssh -f"
              ],
              correctOption: 3,
              explanation: '"journalctl -u <unit>" queries systemd journal records for a specific service unit, and the "-f" flag streams new log entries in real-time.'
            }
          ]
        },
        {
          id: 'lin-remote',
          title: 'Remote Operations (SSH, SCP, rsync)',
          description: 'Establish secure remote shells, transfer files securely, and synchronize directories.',
          duration: '15 mins',
          content: `### Remote Operations

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Archiving & System Services  

#### Learning Objectives
- Configure secure terminal connections using SSH.
- Copy files securely over SSH using \`scp\`.
- Synchronize remote directories using \`rsync\`.

#### Key Concepts
- **SSH (Secure Shell):** Cryptographically secured tunnel protocol used for remote command-line administration (Port 22).
- **SCP (Secure Copy Protocol):** Transcribes local files to a remote host over SSH.
- **rsync:** High-performance delta-transfer utility that synchronizes directory structures securely over SSH.

#### Hands-On Lab: Secure Data Sync
Copy and synchronize directory trees between virtual host parameters:
\`\`\`bash
# Copy a local script to a remote server
scp -i /path/id_rsa my_script.sh user@192.168.10.25:/home/user/

# Sync directory files incrementally, preserving permissions
rsync -avz -e ssh /var/www/html/ user@192.168.10.25:/var/www/html/
\`\`\`

#### Detailed Lesson Content
Secure remote operations are essential for managing system infrastructure. **SSH** secures console access using asymmetric public-key cryptography. To establish passwordless connections, append your client public key (\`id_rsa.pub\`) to the target host\'s authorized keys file (\`~/.ssh/authorized_keys\`). When moving files, **rsync** is preferred over SCP for large directories, as it compares file hashes to transfer only the changed blocks of data (delta transfer), preserving system bandwidth.`,
          quiz: [
            {
              id: 'q-ro-1',
              question: 'In which remote host file should a client\'s public SSH key be placed to authorize secure passwordless key login?',
              options: [
                "/etc/ssh/sshd_config",
                "~/.ssh/id_rsa",
                "~/.ssh/authorized_keys",
                "~/.ssh/known_hosts"
              ],
              correctOption: 2,
              explanation: 'The "~/.ssh/authorized_keys" file stores the public keys of authorized clients, allowing the server to verify ownership of the client\'s private key.'
            },
            {
              id: 'q-ro-2',
              question: 'What is the primary operational advantage of rsync over scp for large directory synchronization?',
              options: [
                "rsync wraps transfers inside its own custom block-cipher VPN.",
                "rsync uses delta-transfers, sending only changed file blocks.",
                "rsync transmits frames directly at OSI Layer 2 without IP.",
                "rsync bypasses remote SSH or daemon authentication checks."
              ],
              correctOption: 1,
              explanation: 'rsync uses an efficient delta-transfer algorithm to copy only modified file segments, saving significant bandwidth and time during large sync jobs.'
            },
            {
              id: 'q-ro-3',
              question: 'Which scp command argument specifies a custom SSH port (e.g. Port 2222) during file copy operations?',
              options: [
                "-P 2222",
                "-port 2222",
                "-e 2222",
                "-p 2222"
              ],
              correctOption: 0,
              explanation: 'The "-P" flag (uppercase) specifies a custom port for scp, whereas the lowercase "-p" preserves file modification times.'
            },
            {
              id: 'q-ro-4',
              question: 'What file is updated on your local system when you connect to a new remote SSH server for the first time, storing its host key?',
              options: [
                "~/.ssh/authorized_keys",
                "/etc/ssh/ssh_config",
                "~/.ssh/id_rsa.pub",
                "~/.ssh/known_hosts"
              ],
              correctOption: 3,
              explanation: 'The "~/.ssh/known_hosts" file records remote host keys, allowing the client to verify the server\'s identity and detect potential man-in-the-middle hijacking.'
            }
          ]
        }
      ]
    },
    {
      id: 'windows-mastery',
      title: 'Windows Administration',
      category: 'foundations',
      lessons: [
        {
          id: 'win-arch',
          title: 'Windows Architecture & Registry',
          description: 'Explore the Windows kernel model, user/kernel space separation, and the Registry hive structure.',
          duration: '15 mins',
          content: `### Windows Architecture & Registry

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Describe the Windows NT operating system kernel model.
- Classify the five primary hives of the Windows Registry.
- Query registry keys to identify malware persistence locations.

#### Key Concepts
- **Windows Kernel Mode (ntoskrnl.exe):** Executive services with full, direct access to hardware and memory rings.
- **Windows User Mode:** Isolated ring boundaries where standard user programs, services, and subsystems (Win32) execute.
- **Windows Registry:** A hierarchical database storing system-wide configurations, boot parameters, and driver settings.

#### Hands-On Lab: Registry Auditing
Query system configurations using CLI search tools:
\`\`\`powershell
# In PowerShell, query active startup directories to find persistent malware entry points
Get-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
\`\`\`

#### Detailed Lesson Content
Windows NT uses a hybrid kernel architecture that separates system operations into two logical rings: **User Mode** (Ring 3) and **Kernel Mode** (Ring 0). User programs interface with hardware through subsystem APIs (such as the Win32 API), which call the system kernel via system calls. The **Windows Registry** is the central configuration database. It is organized into hierarchical folders called **hives** (HKEY_LOCAL_MACHINE, HKEY_CURRENT_USER, etc.), which store key-value configurations. Attackers often target Registry locations like the "Run" keys (\`HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\`) to establish persistence on a system, ensuring their malware launches automatically when the OS boots.`,
          quiz: [
            {
              id: 'q-wa-1',
              question: 'Which Registry hive stores user-specific workspace configurations, desktop wallpapers, and application preferences?',
              options: [
                "HKEY_CURRENT_USER (HKCU)",
                "HKEY_CLASSES_ROOT (HKCR)",
                "HKEY_LOCAL_MACHINE (HKLM)",
                "HKEY_USERS (HKU)"
              ],
              correctOption: 0,
              explanation: 'HKCU maps configuration data directly from the logged-in user\'s profile directory (NTUSER.DAT).'
            },
            {
              id: 'q-wa-2',
              question: 'What is the operational privilege model of Ring 0 in the Windows NT architecture?',
              options: [
                "User Mode, with restricted hardware and memory API visibility",
                "Hypervisor Guest mode, isolated inside sandboxed containers",
                "Active Directory domain-controller administrative privilege mode",
                "Kernel Mode, with direct access to CPU, memory, and hardware"
              ],
              correctOption: 3,
              explanation: 'Ring 0 is Kernel Mode, giving the core OS kernel, device drivers, and executive services direct control over memory and physical hardware.'
            },
            {
              id: 'q-wa-3',
              question: 'Which registry key path is most commonly targeted by threat actors to establish automatic system persistence during startup?',
              options: [
                "HKCR\\.exe",
                "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "HKLM\\System\\CurrentControlSet\\Services",
                "HKCU\\Console\\PowerShell"
              ],
              correctOption: 1,
              explanation: 'Registry Run keys in HKLM or HKCU are designed to launch specified executables automatically when a user logs in, making them primary targets for malware persistence.'
            },
            {
              id: 'q-wa-4',
              question: 'Which of the following is the physical file on disk that contains HKEY_CURRENT_USER settings for a specific user account?',
              options: [
                "REGISTRY.BIN",
                "SYSTEM.DAT",
                "NTUSER.DAT",
                "USER.INI"
              ],
              correctOption: 2,
              explanation: 'Each user\'s NTUSER.DAT file contains their custom HKCU hive settings, which are loaded into memory when they log in.'
            }
          ]
        },
        {
          id: 'win-shells',
          title: 'Windows Command Shells (CMD & PowerShell)',
          description: 'Master standard command-line tools, PowerShell cmdlets, pipeline objects, and security auditing policies.',
          duration: '18 mins',
          content: `### Windows Command Shells (CMD & PowerShell)

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Windows Architecture & Registry  

#### Learning Objectives
- Run basic administrative checks in CMD.
- Utilize PowerShell object pipelines and Cmdlets.
- Identify advanced PowerShell security hardening policies (Execution Policies).

#### Key Concepts
- **CMD (Command Prompt):** Legacy Windows command-line shell interface.
- **PowerShell:** Modern command-line shell and scripting language built on the .NET framework, processing objects instead of simple text streams.
- **Cmdlet:** Lightweight command structures in PowerShell formatted as \`Verb-Noun\` actions (e.g., \`Get-Process\`).
- **Execution Policy:** A system safeguard that controls when PowerShell is permitted to load and run scripts.

#### Hands-On Lab: Command Auditing
Execute administrative diagnostics across shells:
\`\`\`cmd
:: In CMD, print active network configurations and routing pathways
ipconfig /all

:: List active network connection ports and matching process IDs
netstat -ano
\`\`\`

\`\`\`powershell
# In PowerShell, query active processes consuming more than 100MB of RAM
Get-Process | Where-Object { $_.WorkingSet -gt 100MB }
\`\`\`

#### Detailed Lesson Content
While CMD is useful for basic commands, **PowerShell** provides deep access to the OS. Because PowerShell uses the .NET runtime, it returns structured **Objects** rather than flat text, allowing you to easily filter and parse properties (e.g., filtering processes by memory utilization). PowerShell script execution is governed by **Execution Policies** (like \`Restricted\`, \`AllSigned\`, or \`RemoteSigned\`). Note that execution policies are designed as basic safeguards, not robust security boundaries, and can be bypassed by launching PowerShell with flags like \`-ExecutionPolicy Bypass\`.`,
          quiz: [
            {
              id: 'q-ws-1',
              question: 'What makes PowerShell fundamentally different from legacy CMD or Bash shells?',
              options: [
                "PowerShell prohibits chaining commands across vertical pipe stages.",
                "PowerShell pipelines pass structured .NET objects, not raw text.",
                "PowerShell supports execution solely on Windows Server editions.",
                "PowerShell executes cmdlets strictly inside kernel space."
              ],
              correctOption: 1,
              explanation: 'PowerShell operates on .NET objects, allowing subsequent commands in a pipeline to access typed properties directly without complex text parsing with utilities like grep or awk.'
            },
            {
              id: 'q-ws-2',
              question: 'Which cmdlet query searches for running Windows services whose status property is currently set to Stopped?',
              options: [
                "Get-Service | Where-Object { $_.Status -eq \"Stopped\" }",
                "Find-Service -FilterStatus \"Stopped\" -Scope Local",
                "Get-Process -ServiceState \"Stopped\" -ListAll",
                "net service query --state stopped --all"
              ],
              correctOption: 0,
              explanation: '"Get-Service" returns service object instances. Passing them to "Where-Object" filters the results based on their "Status" property.'
            },
            {
              id: 'q-ws-3',
              question: 'Which command line flag allows a user to run a PowerShell script even if the system execution policy is set to Restricted?',
              options: [
                "-SecurityOverride",
                "-ForceRun",
                "-ExecutionPolicy Bypass",
                "-SudoPrivilege"
              ],
              correctOption: 2,
              explanation: 'The "-ExecutionPolicy Bypass" flag instructs PowerShell to skip script execution restrictions, allowing scripts to execute without changing the persistent system policy.'
            },
            {
              id: 'q-ws-4',
              question: 'Which legacy netstat flag displays the numeric port connections and matching Process ID (PID) values?',
              options: [
                "netstat -r",
                "netstat -x",
                "netstat -a",
                "netstat -ano"
              ],
              correctOption: 3,
              explanation: '"netstat -ano" prints active connections, mapping them to local port numbers and the specific Process IDs (PID) that opened them.'
            }
          ]
        },
        {
          id: 'win-ad-logs',
          title: 'Active Directory & Event Logs',
          description: 'Identify domain controller networks, Kerberos tickets, and Event Viewer security structures.',
          duration: '20 mins',
          content: `### Active Directory & Event Logs

**Difficulty:** Medium  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Windows Command Shells (CMD & PowerShell)  

#### Learning Objectives
- Explain Active Directory structure (Forests, Domains, OUs, Objects).
- Describe Kerberos authentication.
- Monitor security event trails using Event Viewer.

#### Key Concepts
- **Active Directory (AD):** Directory service providing centralized identity and access management for Windows domain networks.
- **Domain Controller (DC):** The central server that authenticates users and enforces security policies across an AD domain.
- **Organizational Unit (OU):** Containers within a domain used to organize users, computers, and groups.
- **Kerberos:** The standard ticket-based authentication protocol used in Active Directory networks.
- **Event Viewer:** Windows utility for viewing system, security, and application logs.

#### Hands-On Lab: Log Auditing
Query security logs for logon events:
\`\`\`powershell
# Query the Windows security event log for successful logons (Event ID 4624)
Get-WinEvent -FilterHashtable @{LogName='Security';ID=4624} -MaxEvents 5
\`\`\`

#### Detailed Lesson Content
**Active Directory** simplifies enterprise resource management by centralizing user authentication and device authorization under a central database managed by **Domain Controllers**. Authentication is primarily handled by **Kerberos**, which uses symmetric cryptography and Ticket-Granting Tickets (TGT) to verify user identities across the network. All authentication attempts and process executions are recorded in the system logs, which can be audited via the **Event Viewer**. Key Security Log IDs include **4624** (Successful Logon) and **4625** (Failed Logon), which are essential for detecting brute force attacks and credential abuse.`,
          quiz: [
            {
              id: 'q-wad-1',
              question: 'Which Windows Event ID represents a successful account logon, which is crucial for auditing lateral movement?',
              options: [
                "Event ID 4720",
                "Event ID 4625",
                "Event ID 4624",
                "Event ID 4688"
              ],
              correctOption: 2,
              explanation: 'Event ID 4624 is logged in the Windows Security log whenever an authentication request succeeds.'
            },
            {
              id: 'q-wad-2',
              question: 'What is the main role of a Domain Controller (DC) in an Active Directory network?',
              options: [
                "To manage central directory objects and domain authentication.",
                "To cache recursive public DNS queries across branch routers.",
                "To route Layer 3 IP packets across internal corporate VLANs.",
                "To inspect perimeter traffic as a stateful network firewall."
              ],
              correctOption: 0,
              explanation: 'The Domain Controller runs active directory database services, validating authentication requests and enforcing security policies across domain resources.'
            },
            {
              id: 'q-wad-3',
              question: 'Which authentication protocol is standard in modern Active Directory domains, utilizing cryptographic tickets?',
              options: [
                "NTLM v1",
                "RADIUS",
                "LDAP",
                "Kerberos"
              ],
              correctOption: 3,
              explanation: 'Kerberos is the primary authentication protocol in Windows domains, using ticket-granting structures to authorize access without transmitting cleartext passwords.'
            },
            {
              id: 'q-wad-4',
              question: 'Which event log category stores system execution events, policy audits, and authentication trails?',
              options: [
                "System Log",
                "Security Log",
                "Setup Log",
                "Application Log"
              ],
              correctOption: 1,
              explanation: 'The Security log records logon/logoff events, audit policies, and access control changes, making it critical for security analysis.'
            }
          ]
        },
        {
          id: 'win-services-firewall',
          title: 'OS Services & Security Controls',
          description: 'Manage background services, automate tasks, and harden system parameters using Windows Defender and Firewalls.',
          duration: '18 mins',
          content: `### OS Services & Security Controls

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Active Directory & Event Logs  

#### Learning Objectives
- Control Windows services.
- Schedule automatic tasks.
- Configure Windows Firewall rules and Defender settings.

#### Key Concepts
- **Windows Service:** A background process that executes without requiring an active user login.
- **Task Scheduler:** OS utility that automates script execution based on specified triggers.
- **Windows Firewall:** Host-based firewall filtering inbound and outbound network traffic.
- **Microsoft Defender:** Built-in security suite providing real-time antivirus, threat detection, and exploit protection.

#### Hands-On Lab: Service Hardening
Audit background operations and configure local firewall parameters using PowerShell:
\`\`\`powershell
# Query all Windows services that are configured to start automatically
Get-Service | Where-Object { $_.StartType -eq 'Automatic' }

# Create a local inbound firewall rule blocking port 445 (SMB)
New-NetFirewallRule -DisplayName "Block Inbound SMB" -Direction Inbound -LocalPort 445 -Protocol TCP -Action Block
\`\`\`

#### Detailed Lesson Content
Windows background tasks are managed as **Services**, which execute in isolated system sessions without user interaction. Managing these configurations is essential for host security: disabling unused services reduces the host\'s attack surface. To automate administrative tasks like log backups, use the **Task Scheduler**. Network-level defense is enforced by **Windows Firewall**, which filters traffic using host-based rules, while **Microsoft Defender** provides file-level protection using signature-based detection and heuristic threat analysis.`,
          quiz: [
            {
              id: 'q-wsc-1',
              question: 'Which Windows utility is used to schedule scripts to run automatically at specific times or in response to system triggers?',
              options: [
                "Windows Registry",
                "Services Manager",
                "Event Viewer",
                "Task Scheduler"
              ],
              correctOption: 3,
              explanation: 'Task Scheduler automates administrative tasks and scripts based on specified time, boot, or event-based triggers.'
            },
            {
              id: 'q-wsc-2',
              question: 'What is the security risk of leaving unneeded Windows services running on a server?',
              options: [
                "They purge historical Security and System Windows Event Logs.",
                "They widen the host attack surface with extra entry points.",
                "They silently disable Windows Defender real-time cloud protection.",
                "They force every domain service to downgrade authentication from Kerberos."
              ],
              correctOption: 1,
              explanation: 'Disabling unnecessary services follows security best practices: it reduces active processes, listening ports, and potential vulnerabilities.'
            },
            {
              id: 'q-wsc-3',
              question: 'Which PowerShell cmdlet creates a new inbound rule for the host-based Windows Defender Firewall?',
              options: [
                "New-NetFirewallRule",
                "Set-FirewallActive",
                "Block-NetworkPort",
                "Get-WinEvent"
              ],
              correctOption: 0,
              explanation: '"New-NetFirewallRule" configures advanced network filtering parameters, including ports, directions, and actions directly from PowerShell.'
            },
            {
              id: 'q-wsc-4',
              question: 'What is the function of signature-based detection in Microsoft Defender Antivirus?',
              options: [
                "Provisioning and rotating Active Directory domain accounts",
                "Monitoring CPU core thermal and voltage anomalies",
                "Matching file hashes and byte patterns against threat signatures",
                "Profiling long-term disk and memory performance degradation"
              ],
              correctOption: 2,
              explanation: 'Signature-based scanning checks files against databases of known malware patterns to identify and quarantine matched files instantly.'
            }
          ]
        }
      ]
    },
    {
      id: 'virt-containers',
      title: 'Virtualization & Containers',
      category: 'foundations',
      lessons: [
        {
          id: 'hyp-compare',
          title: 'Hypervisors (VirtualBox, VMware, Hyper-V)',
          description: 'Deploy Type 1 and Type 2 hypervisors, and configure guest virtualization layers.',
          duration: '15 mins',
          content: `### Hypervisors (VirtualBox, VMware, Hyper-V)

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Install guest VMs inside a hypervisor framework.
- Configure virtual network switches (NAT, Bridged, Host-Only).
- Compare physical resource allocation methods in virtualization.

#### Key Concepts
- **Type 2 Hypervisor:** Runs as software on a host operating system (e.g., VirtualBox, VMware Workstation).
- **Type 1 Hypervisor:** Runs directly on physical hardware (e.g., VMware ESXi, Hyper-V in bare-metal configurations).
- **NAT Network:** Guests share the host\'s IP address to access external networks.
- **Bridged Network:** Guest interfaces connect directly to the physical network, receiving their own local IP.
- **Host-Only Network:** Guests are isolated in a private network accessible only by the host.

#### Detailed Lesson Content
Virtual machines run in isolated sandbox environments managed by a **hypervisor**. Understanding virtual networking models is essential for building a secure security lab:
- **NAT Mode** protects guest systems from external network scanning by hiding them behind the host\'s IP.
- **Bridged Mode** exposes guest VMs directly to the local network, which is useful when hosting public services.
- **Host-Only Mode** isolates guests in an offline network, which is critical when analyzing live malware payloads to prevent lateral spread across your physical network.`,
          quiz: [
            {
              id: 'q-hc-1',
              question: 'Which virtual network adapter mode assigns a guest virtual machine an independent IP address directly on the host\'s physical network?',
              options: [
                "Bridged Mode",
                "NAT Mode",
                "Host-Only Mode",
                "Internal-Only Mode"
              ],
              correctOption: 0,
              explanation: 'Bridged networking binds the virtual machine\'s network adapter directly to the host\'s physical interface, making the VM appear as an independent device on the LAN.'
            },
            {
              id: 'q-hc-2',
              question: 'Which of the following is a classic Type 2 hosted hypervisor used to build local testing labs?',
              options: [
                "VMware ESXi",
                "Proxmox VE",
                "KVM",
                "Oracle VirtualBox"
              ],
              correctOption: 3,
              explanation: 'VirtualBox is a Type 2 hypervisor, executing as software on top of a standard host operating system like Windows or macOS.'
            },
            {
              id: 'q-hc-3',
              question: 'What is the primary advantage of utilizing Type 1 bare-metal hypervisors in enterprise data centers?',
              options: [
                "They require less planning and configuration than Type 2 hypervisors.",
                "They disable virtual machine snapshots by design for isolation.",
                "They run directly on bare-metal hardware without host OS overhead.",
                "They operate reliably without CPU hardware virtualization extensions."
              ],
              correctOption: 2,
              explanation: 'Type 1 hypervisors eliminate host OS overhead, communicating directly with server hardware to maximize throughput for enterprise workloads.'
            },
            {
              id: 'q-hc-4',
              question: 'Why is Host-Only networking preferred when analyzing malware inside a virtual machine?',
              options: [
                "It pulls daily antivirus signature updates directly into the guest.",
                "It isolates the VM from external networks and the physical LAN.",
                "It enforces full-disk encryption across the VM virtual disk image.",
                "It accelerates high-bandwidth external internet throughput speeds."
              ],
              correctOption: 1,
              explanation: 'Host-Only mode restricts network access to a private ring containing only the host and guest, preventing malware from accessing the internet or scanning your local LAN.'
            }
          ]
        },
        {
          id: 'docker-basics',
          title: 'Containerization (Docker, Docker Images, Docker Containers, Docker Compose)',
          description: 'Build secure docker images, run isolated microservice containers, and write docker-compose configurations.',
          duration: '18 mins',
          content: `### Containerization (Docker)

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Hypervisors (VirtualBox, VMware, Hyper-V)  

#### Learning Objectives
- Write secure Dockerfiles.
- Build and run isolated Docker containers.
- Orchestrate multi-container environments using Docker Compose.

#### Key Concepts
- **Docker Image:** A read-only template containing the application code, runtime environment, and system dependencies.
- **Docker Container:** A runnable instance of a Docker image, isolated from other containers and the host OS.
- **Dockerfile:** A text file containing instructions to build a Docker image.
- **Docker Compose:** Utility for defining and running multi-container applications using YAML configurations.

#### Hands-On Lab: Container Deployments
Build and run a secure container environment using the terminal:
\`\`\`bash
# Create a simple Dockerfile
cat << 'EOF' > Dockerfile
FROM alpine:latest
RUN apk add --no-cache curl
ENTRYPOINT ["curl"]
EOF

# Build the custom image
docker build -t alpine-curl .

# Run the container to query an external web service
docker run --rm alpine-curl https://ifconfig.me
\`\`\`

#### Detailed Lesson Content
Unlike heavy virtual machines, **Docker Containers** utilize OS-level virtualization. Containers share the host operating system\'s kernel, isolating applications using native Linux kernel features: **namespaces** (which isolate process lists, network adapters, and mounts) and **cgroups** (which enforce hardware resource limits like CPU and RAM). Using lightweight containers allows developers to package applications with their dependencies, ensuring consistent and secure deployments across development and production environments.`,
          quiz: [
            {
              id: 'q-db-1',
              question: 'What is the primary architectural difference between a virtual machine and a Docker container?',
              options: [
                "Containers boot dedicated guest kernels; VMs share one host kernel.",
                "Containers execute strictly in kernel space; VMs run in user space.",
                "Containers share the host OS kernel; VMs boot separate guest OSes.",
                "Virtual machines rely on Linux cgroups while containers use hypervisors."
              ],
              correctOption: 2,
              explanation: 'Docker containers share the host kernel and isolate processes using namespaces and cgroups, making them much lighter and faster than traditional virtual machines.'
            },
            {
              id: 'q-db-2',
              question: 'Which Docker file contains commands and configurations used to build read-only container images?',
              options: [
                "Dockerfile",
                "container.config",
                "docker-compose.yml",
                "package.json"
              ],
              correctOption: 0,
              explanation: 'A Dockerfile is a text-based build script containing sequential instructions (FROM, RUN, COPY, etc.) used to compile a Docker image.'
            },
            {
              id: 'q-db-3',
              question: 'Which tool is used to define, launch, and manage multi-container application stacks using a single YAML configuration file?',
              options: [
                "Kubernetes Pods",
                "Docker Compose",
                "VirtualBox Manager",
                "Docker Swarm"
              ],
              correctOption: 1,
              explanation: 'Docker Compose uses a "docker-compose.yml" file to orchestrate multi-container application environments (such as a web server paired with a database) with a single command.'
            },
            {
              id: 'q-db-4',
              question: 'Which docker command is used to connect directly to an interactive terminal shell inside a running container?',
              options: [
                "docker start",
                "docker connect",
                "docker run -d",
                "docker exec -it"
              ],
              correctOption: 3,
              explanation: '"docker exec -it <container_name> <shell>" runs an interactive terminal session inside an already running container instance.'
            }
          ]
        },
        {
          id: 'k8s-basics',
          title: 'Orchestration Basics (Kubernetes Basics)',
          description: 'Deconstruct Kubernetes orchestration components, pods, nodes, and cluster control planes.',
          duration: '18 mins',
          content: `### Orchestration Basics (Kubernetes Basics)

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Containerization (Docker)  

#### Learning Objectives
- Map the core structural components of a Kubernetes cluster.
- Define Pods, Services, and Deployments.
- Understand Kubernetes API control plane operations.

#### Key Concepts
- **Pod:** The smallest deployable computing unit in Kubernetes, hosting one or more containers sharing storage and network resources.
- **Node:** A physical or virtual worker machine running containerized workloads in a cluster.
- **Control Plane:** The central brain of the cluster, managing scheduling, state, and API requests (e.g., API Server, etcd, Scheduler).
- **Service:** An abstraction that defines a logical set of Pods and a policy to access them (handling load balancing and IP routing).

#### Hands-On Lab: Cluster Inspection
Inspect running pods and verify your Kubernetes CLI connection:
\`\`\`bash
# List pods in the active namespace
kubectl get pods

# Verify kubectl client and cluster versions
kubectl version
\`\`\`

#### Detailed Lesson Content
As container deployments scale to hundreds of hosts, manual management becomes impossible. **Kubernetes (K8s)** is an open-source container orchestration platform designed to automate container deployment, scaling, and management.
- The **Control Plane** manages cluster state via the **kube-apiserver** and stores configuration data in **etcd** (a secure distributed key-value store).
- Worker **Nodes** run containerized workloads inside **Pods**, with **kubelet** agents on each node communicating with the control plane to ensure containers run securely.`,
          quiz: [
            {
              id: 'q-kb-1',
              question: 'What is the smallest deployable computing unit in a Kubernetes cluster, hosting one or more container instances?',
              options: [
                "Pod",
                "Node",
                "Service",
                "Deployment"
              ],
              correctOption: 0,
              explanation: 'A Pod is the fundamental deployment block in Kubernetes, hosting tightly coupled container instances that share storage and network namespaces.'
            },
            {
              id: 'q-kb-2',
              question: 'Which component of the Kubernetes Control Plane acts as the central datastore, recording the state and configuration of the entire cluster?',
              options: [
                "kube-apiserver",
                "kube-scheduler",
                "etcd",
                "kubelet"
              ],
              correctOption: 2,
              explanation: 'etcd is a highly-available, distributed key-value store that acts as the source of truth for all Kubernetes cluster state details.'
            },
            {
              id: 'q-kb-3',
              question: 'What is the role of the kubelet daemon running on each Kubernetes worker node?',
              options: [
                "To apply relational SQL schema migrations on cluster databases.",
                "To watch node pod specs and keep assigned containers healthy.",
                "To schedule unplaced pods across healthy worker nodes cluster-wide.",
                "To distribute inbound HTTP sessions across external load balancers."
              ],
              correctOption: 1,
              explanation: 'The kubelet is an agent daemon running on each node that ensures containers described in pod specifications are running and healthy.'
            },
            {
              id: 'q-kb-4',
              question: 'Which Kubernetes abstraction provides a stable network IP address and DNS name to route traffic to dynamic, ephemeral Pods?',
              options: [
                "Volume",
                "DaemonSet",
                "Namespace",
                "Service"
              ],
              correctOption: 3,
              explanation: 'A Kubernetes Service acts as an internal load balancer, exposing a stable network port and routing traffic to active Pod instances.'
            }
          ]
        }
      ]
    },
    {
      id: 'git-dev',
      title: 'Git & Development',
      category: 'foundations',
      lessons: [
        {
          id: 'git-workflows',
          title: 'Git & GitHub Workflows',
          description: 'Master version control operations, code branching strategies, and collaborative pull request workflows.',
          duration: '15 mins',
          content: `### Git & GitHub Workflows

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Initialize local Git repositories and clone remote repositories.
- Manage the Git staging environment (add, commit, push, pull).
- Perform branch merging operations and resolve conflicts.

#### Key Concepts
- **Repository (Repo):** A folder containing all project files and their revision histories.
- **Staging Area:** The intermediate buffer space where changes are prepared before being committed.
- **Commit:** A snapshot of changes recorded in the repository\'s history.
- **Branch:** An independent line of development, allowing team members to work on features concurrently.

#### Hands-On Lab: Git Basics
Track file changes in a local directory using Git:
\`\`\`bash
# Initialize a new Git repository
git init my_project

# Change directory and create a sample file
cd my_project
echo "Initial Content" > index.md

# Stage the file and commit changes
git add index.md
git commit -m "Initial commit of index.md"

# Create a new development branch
git checkout -b feature-branch
\`\`\`

#### Detailed Lesson Content
Version control is critical for software engineering and security operations. **Git** is a distributed version control system tracking source code modifications. Collaborating on platforms like **GitHub** relies on branching: developers commit features to custom branches, pushing them to remote repositories to be reviewed via **Pull Requests** before merging into the production codebase.`,
          quiz: [
            {
              id: 'q-gw-1',
              question: 'Which Git command is used to download an existing remote repository onto your local workstation?',
              options: [
                "git clone",
                "git init",
                "git pull",
                "git checkout"
              ],
              correctOption: 0,
              explanation: '"git clone" downloads a complete remote repository, including its file tree and full commit history, to your local system.'
            },
            {
              id: 'q-gw-2',
              question: 'What is the purpose of the Git staging area (staging environment)?',
              options: [
                "To automatically resolve competing line edits during branch merges.",
                "To deploy modified repository code straight into production clusters.",
                "To asymmetrically sign and encrypt local workspace changes on disk.",
                "To buffer and review file edits before recording a commit."
              ],
              correctOption: 3,
              explanation: 'The staging area allows you to selectively stage file changes using "git add" before committing them as a single logical snapshot.'
            },
            {
              id: 'q-gw-3',
              question: 'Which command is used to send your local committed changes to a remote repository like GitHub?',
              options: [
                "git pull",
                "git push",
                "git commit",
                "git fetch"
              ],
              correctOption: 1,
              explanation: '"git push" uploads your local branch commits to the corresponding remote repository branch.'
            },
            {
              id: 'q-gw-4',
              question: 'What is the result of running git checkout -b dev-test in a repository?',
              options: [
                "Discarding all tracked and untracked changes in the working tree.",
                "Permanently deleting the local dev-test tracking branch.",
                "Creating branch dev-test and switching the workspace onto it.",
                "Merging the existing dev-test branch directly into production."
              ],
              correctOption: 2,
              explanation: 'The "-b" flag combined with checkout creates a new branch and instantly switches your active workspace context to it.'
            }
          ]
        },
        {
          id: 'markup-formats',
          title: 'Structured Formats (Markdown, JSON, YAML)',
          description: 'Read and write standardized structured data formats used in documentation and cloud configuration.',
          duration: '15 mins',
          content: `### Structured Formats (Markdown, JSON, YAML)

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Format clean text documents using Markdown syntax.
- Read and validate JSON data objects.
- Write structured service configurations in YAML.

#### Key Concepts
- **Markdown:** Lightweight markup language for formatting plain text documents.
- **JSON (JavaScript Object Notation):** Key-value structured data format widely used in APIs and databases.
- **YAML (YAML Ain\'t Markup Language):** Human-readable data serialization language standard in cloud orchestration (Kubernetes, Docker Compose).

#### Detailed Lesson Content
Structured data formats are the language of automation:
- **Markdown** simplifies writing formatted documentation (headers, code blocks, bullet points).
- **JSON** uses structured curly-bracket mappings for machine communication (e.g., REST API payloads).
- **YAML** relies on clean indentation instead of brackets, making it easy to read and ideal for configuration files (like Ansible playbooks and Kubernetes manifests).`,
          quiz: [
            {
              id: 'q-mf-1',
              question: 'Which data format relies on nested indentation to define structural hierarchy rather than curly brackets or tags?',
              options: [
                "JSON",
                "YAML",
                "XML",
                "HTML"
              ],
              correctOption: 1,
              explanation: 'YAML uses clean white space indentation, making it highly readable and standard for cloud configurations.'
            },
            {
              id: 'q-mf-2',
              question: 'Which of the following is a valid JSON object structure representing user data?',
              options: [
                "<user><name>Alice</name></user>",
                "name: Alice \nrole: admin",
                "user = [name: \"Alice\"]",
                "{ \"name\": \"Alice\", \"role\": \"admin\" }"
              ],
              correctOption: 3,
              explanation: 'JSON requires double quotes around both keys and string values, with elements enclosed within curly brackets.'
            },
            {
              id: 'q-mf-3',
              question: 'Which Markdown syntax creates a level 3 heading?',
              options: [
                "* Heading",
                "=== Heading ===",
                "### Heading",
                "Heading (lvl 3)"
              ],
              correctOption: 2,
              explanation: 'In Markdown, hash characters (#) indicate heading levels; three hashes (###) create a level 3 heading.'
            },
            {
              id: 'q-mf-4',
              question: 'What is a common security concern when parsing JSON or YAML payloads from untrusted external API inputs?',
              options: [
                "Insecure deserialization, executing code when untrusted data is parsed.",
                "They immediately trigger unscheduled kernel panics and host reboots.",
                "They purge hidden .git object history from the project folder.",
                "They disable system TLS certificate chain validation at startup."
              ],
              correctOption: 0,
              explanation: 'Insecure deserialization vulnerabilities occur when parser engines execute embedded payloads while converting structured strings back into executable runtime objects.'
            }
          ]
        }
      ]
    },
    {
      id: 'python-cyber',
      title: 'Python for Cybersecurity',
      category: 'foundations',
      lessons: [
        {
          id: 'py-basics',
          title: 'Python Basics & Data Structures',
          description: 'Learn core Python scripting, data types, logic structures, lists, and dictionaries.',
          duration: '18 mins',
          content: `### Python Basics & Data Structures

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Write simple Python automation scripts.
- Use basic variable types and loop structures.
- Manage structured records using Python lists and dictionaries.

#### Key Concepts
- **Variables & Types:** Integers, floats, strings, and booleans.
- **Lists:** Ordered, mutable sequences of values (e.g., \`ips = ["10.0.0.1", "10.0.0.2"]\`).
- **Dictionaries:** Key-value pairs for quick data lookups (e.g., \`user = {"name": "Alice", "admin": True}\`).
- **Loops & Conditionals:** Standard flow control structures (\`for\`, \`while\`, \`if\`).

#### Hands-On Lab: Scripting Automation
Run python commands to organize target profiles:
\`\`\`bash
# Launch interactive Python terminal and create a dictionary
python3 -c "
targets = {'firewall': '10.0.0.1', 'web_srv': '10.0.0.5'}
for srv, ip in targets.items():
    print(f'Target {srv} is mapped to host {ip}')
"
\`\`\`

#### Detailed Lesson Content
Python is the standard language for security scripting and tool automation due to its readability and massive library ecosystem.
Security operators use Python to script rapid tasks like IP subnet sorting and host parsing. In Python, **Lists** hold ordered sequences of data, while **Dictionaries** store key-value mappings, allowing you to access nested data objects quickly (like parsing JSON log outputs).`,
          quiz: [
            {
              id: 'q-pb-1',
              question: 'Which Python data structure stores un-ordered, mutable key-value mappings?',
              options: [
                "Tuple",
                "Set",
                "List",
                "Dictionary"
              ],
              correctOption: 3,
              explanation: 'Dictionaries in Python use key-value mappings (enclosed in curly brackets) to provide fast, hashed data lookups.'
            },
            {
              id: 'q-pb-2',
              question: 'Which line of Python code correctly iterates through a list of ports named port_list?',
              options: [
                "for port in port_list:",
                "loop port through port_list:",
                "while port_list as port:",
                "foreach port in port_list:"
              ],
              correctOption: 0,
              explanation: 'Python uses "for item in iterable:" syntax to loop through sequences like lists.'
            },
            {
              id: 'q-pb-3',
              question: 'What is the index value of the very first element in a Python list?',
              options: [
                "First",
                "0",
                "1",
                "-1"
              ],
              correctOption: 1,
              explanation: 'Python lists are zero-indexed, meaning the first element is accessed using index 0 (e.g., list[0]).'
            },
            {
              id: 'q-pb-4',
              question: 'What is the file extension for standard executable Python scripts?',
              options: [
                ".sh",
                ".ps1",
                ".py",
                ".exe"
              ],
              correctOption: 2,
              explanation: 'Python script files use the ".py" extension, which is interpreted and run by the Python engine.'
            }
          ]
        },
        {
          id: 'py-file-regex',
          title: 'File Operations & Regular Expressions',
          description: 'Parse large server logs, read/write files, and extract threat indicators using Regular Expressions.',
          duration: '18 mins',
          content: `### File Operations & Regular Expressions

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Python Basics & Data Structures  

#### Learning Objectives
- Read and write files securely using Python context managers (\`with open\`).
- Apply Regular Expressions (\`re\` library) to extract security indicators of compromise (IoCs).
- Parse network log strings dynamically.

#### Key Concepts
- **Context Manager (\`with\`):** Ensures files are closed properly after operations, preventing memory leaks.
- **Regular Expressions (Regex):** Standard pattern-matching syntax for extracting specific text strings.
- **IoC Extraction:** Isolating IP addresses, domain names, and file hashes from logs.

#### Hands-On Lab: Parsing Logs with Regex
Write a Python script to scan log strings and extract IPv4 addresses:
\`\`\`bash
python3 -c "
import re
log = 'Failed SSH login attempt from 192.168.4.120 port 5021'
ip_pattern = r'[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}'
match = re.search(ip_pattern, log)
if match:
    print('Found IP Address:', match.group())
"
\`\`\`

#### Detailed Lesson Content
Analyzing security events requires processing log data. In Python, using context managers (\`with open('file.log', 'r') as f:\`) is best practice: it ensures the operating system closes file streams automatically after operations. Once files are opened, Python\'s **Regular Expressions (re)** library is a powerful tool for parsing logs, allowing you to use regex patterns (like \`\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\`) to quickly scan raw logs and extract Indicators of Compromise (IoCs) like IP addresses, email accounts, and MD5 file hashes.`,
          quiz: [
            {
              id: 'q-pfr-1',
              question: 'Why is it best practice to use a "with" statement context manager when opening files in Python?',
              options: [
                "It guarantees the file handle closes cleanly, even on exceptions.",
                "It serializes plain UTF-8 text buffers directly into valid JSON.",
                "It transparently encrypts file streams written onto physical disk.",
                "It elevates the Python process automatically to administrator rights."
              ],
              correctOption: 0,
              explanation: 'The "with" statement automatically manages resource cleanup, closing open files to prevent file locking and memory leaks.'
            },
            {
              id: 'q-pfr-2',
              question: 'Which regular expression pattern matches a sequence of exactly four consecutive digits (e.g., a year)?',
              options: [
                "\\w{4}",
                "\\\\d4",
                "\\d{4}",
                "[0-9][4]"
              ],
              correctOption: 2,
              explanation: '"\\d" represents any digit, and curly brackets specify the exact number of occurrences, so "\\d{4}" matches exactly 4 consecutive digits.'
            },
            {
              id: 'q-pfr-3',
              question: 'Which Python standard library is used for compiling and executing regular expressions?',
              options: [
                "regex",
                "math",
                "os",
                "re"
              ],
              correctOption: 3,
              explanation: 'The "re" library is Python\'s built-in module for working with regular expressions.'
            },
            {
              id: 'q-pfr-4',
              question: 'What does the file open mode "a" represent in Python?',
              options: [
                "Open and parse lines as an array",
                "Open for appending data at file end",
                "Open in exclusive read-write editing mode",
                "Open with elevated administrator access rights"
              ],
              correctOption: 1,
              explanation: 'The "a" mode opens a file for appending, writing new data to the end of the file without destroying existing content.'
            }
          ]
        },
        {
          id: 'py-automation',
          title: 'Network Automation & Scapy',
          description: 'Script custom web requests, construct raw packets, and perform network scanning using Scapy.',
          duration: '20 mins',
          content: `### Network Automation & Scapy

**Difficulty:** Hard  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** File Operations & Regular Expressions  

#### Learning Objectives
- Automate HTTP requests using the \`requests\` library.
- Fabricate and inspect network packets using Scapy.
- Script a custom ICMP scanner.

#### Key Concepts
- **requests Library:** Python module used to send clean, automated HTTP/HTTPS requests.
- **Scapy:** A powerful, interactive packet manipulation library that allows you to capture, dissect, forge, and send network packets.
- **Packet Crafting:** Building custom network packets from scratch, defining custom headers across layers.

#### Hands-On Lab: Scapy Packet Crafting
Craft a custom ICMP packet using Scapy:
\`\`\`bash
# Launch python and forge a packet with custom layer definitions
sudo python3 -c "
from scapy.all import IP, ICMP, sr1
# Craft an IP header targeting 1.1.1.1, layered with an ICMP packet
packet = IP(dst='1.1.1.1')/ICMP()
# Send packet and await first response
response = sr1(packet, timeout=2)
if response:
    response.show()
"
\`\`\`

#### Detailed Lesson Content
Network security automation involves both high-level and low-level scripting. The Python **requests** library handles high-level web operations, allowing you to easily scrape APIs and automate login tasks. For low-level network operations, **Scapy** is the standard. It allows you to forge custom packets at any layer (e.g., stacking an IP layer with a TCP layer: \`packet = IP(dst="10.0.0.1")/TCP(dport=80, flags="S")\`), making it a powerful tool for crafting custom scanners, testing firewall rules, and analyzing packet traffic.`,
          quiz: [
            {
              id: 'q-pa-1',
              question: 'Which Python library is used to craft, forge, capture, and dissect custom network packets at multiple layers?',
              options: [
                "socket",
                "urllib",
                "Scapy",
                "requests"
              ],
              correctOption: 2,
              explanation: 'Scapy is a powerful packet-crafting library that allows you to define headers at any layer of the network stack and send them over physical interfaces.'
            },
            {
              id: 'q-pa-2',
              question: 'In Scapy, what operator is used to stack different network protocol layers together (e.g., combining an IP header with a TCP header)?',
              options: [
                ">>",
                "/",
                "+",
                "|"
              ],
              correctOption: 1,
              explanation: 'The forward slash (/) operator is overloaded in Scapy to stack layer objects on top of each other (e.g., IP()/TCP()).'
            },
            {
              id: 'q-pa-3',
              question: 'Which method in the Python requests library is used to retrieve data from a web API server?',
              options: [
                "requests.post()",
                "requests.fetch()",
                "requests.query()",
                "requests.get()"
              ],
              correctOption: 3,
              explanation: 'The "requests.get()" method sends an HTTP GET request to retrieve a specified resource from a web server.'
            },
            {
              id: 'q-pa-4',
              question: 'What is the function of the sr1() method in Scapy?',
              options: [
                "Send one crafted packet and capture the first response",
                "Launch an unbounded background packet sniffer daemon",
                "Flush an active packet capture queue into pcapng",
                "Sweep an entire CIDR subnet for open TCP ports"
              ],
              correctOption: 0,
              explanation: 'The "sr1()" function sends packets at Layer 3 and returns exactly one response packet, making it ideal for pings and port checks.'
            }
          ]
        }
      ]
    }
  ]
};
