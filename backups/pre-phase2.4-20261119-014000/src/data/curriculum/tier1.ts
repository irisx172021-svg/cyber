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
- Identify core physical components of a computing system under the **Von Neumann architecture** (CPU, buses, volatile memory, persistent storage).
- Trace the CPU instruction lifecycle across **Fetch, Decode, Execute, and Writeback** alongside **CPU Registers** and SRAM caches.
- Compare **volatile** memory (DRAM/SRAM) with **non-volatile** storage media (HDD, SSD NAND flash, NVMe).

#### Why It Matters
Every software program, encryption key, and log entry ultimately lives as voltage levels in silicon or charges in persistent blocks. Understanding what survives a reboot versus what vanishes when power drops explains both everyday troubleshooting and why incident responders capture memory before powering down compromised hosts.

#### Prerequisites & Connections
This entry-level lesson requires **None** in prerequisites and anchors the entire CyberFoundations Academy progression—unlocking **System Boot & OS Architecture**, **Network Topologies, OSI & TCP/IP Reference models**, **Git & GitHub Workflows**, and **C & Memory Foundations for Security**.

#### Core Explanation
Computing hardware separates fast temporary workspace from durable storage under the **Von Neumann architecture**, where shared system buses transfer instructions and data between processor cores and memory:
- **Central Processing Unit (CPU) & Instruction Cycle:** The processor executes machine code through repeating **Fetch** (load instruction bytes), **Decode** (interpret opcode and operands), **Execute** (compute in ALU/control logic), and **Writeback** steps using ultra-fast on-chip **CPU Registers** and L1/L2/L3 SRAM caches.
- **Volatile Memory (RAM):** High-speed dynamic memory (DRAM) holding active OS kernels, running apps, and open files—losing its stored contents immediately once electrical power is removed.
- **Non-Volatile Persistent Storage:** Magnetic Hard Disk Drives (HDDs) or Solid State Drives (SSDs / NVMe) using **NAND flash** floating-gate transistors that retain files cleanly across full power cycles.

#### How It Works
When you open a document or security tool, storage controllers read blocks off the NVMe SSD into DRAM across the system bus. The CPU fetches opcodes from RAM into caches and registers to execute instructions at nanosecond speeds, writing updated files back to persistent NAND blocks only when saved or flushed.

#### Real-World Context
Understanding hardware volatility shapes operational security decisions every day: encrypting an SSD (via BitLocker or LUKS) protects data at rest when a laptop is powered off, whereas active decryption keys and unencrypted session secrets still sit temporarily inside volatile RAM while the machine stays awake or suspended.

#### Examples
Inspecting CPU architecture, block devices, and RAM utilization on a Linux workstation:
\`\`\`bash
# Display CPU cores, architecture, and cache hierarchy
lscpu

# List persistent block storage disks (NVMe/SSD/HDD) and mount points
lsblk

# Inspect volatile RAM and swap utilization
free -h
\`\`\`

#### Security Relevance
- **Defensive Value:** Pairing hardware **TPM (Trusted Platform Module)** key sealing with Full Disk Encryption protects stolen laptops at rest, while capturing volatile RAM prior to shutdown preserves critical forensic evidence.
- **Attacker Misuse:** Opportunistic threats harvest plaintext secrets out of swap files or hibernate images written to unencrypted disks, or extract active credentials left unlocked in volatile memory on unattended terminals.

#### Common Mistakes
- Confusing **RAM** capacity (volatile working memory) with **SSD/NVMe** capacity (persistent storage).
- Assuming deleting a file or wiping a browser tab instantly clears every copy out of RAM or disk blocks.
- Powering off an actively compromised machine first, wiping out volatile runtime artifacts needed during triage.

#### Key Takeaways
- **Volatile memory (RAM)** loses its state when power drops; **non-volatile SSDs (NAND flash)** and HDDs retain data across reboots.
- **CPU Registers** hold active instruction inputs at the lowest hardware level inside processor cores.
- During the **Decode phase**, the CPU translates binary machine opcodes into control signals before **Execute**.

#### Knowledge Check
- Why does RAM lose active session data on power loss while an SSD preserves your saved files?
- Which hardware storage location inside the processor core operates faster than L1 cache and DRAM?
- What happens during the **Decode** step of the CPU instruction cycle?

#### Further Learning
Review how motherboard firmware bridges physical components into an operating system in **System Boot & OS Architecture**, and consult \`man lscpu\` and \`man lsblk\` on Linux.`,
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
- Contrast legacy **BIOS / MBR** boot workflows with modern **UEFI / GPT** and **Secure Boot** signature checks.
- Differentiate **processes** (isolated virtual address spaces) from **threads** sharing parent memory.
- Explain **Virtual Memory** translation (Page Tables + CPU MMU) and modern filesystems including **NTFS** and **ext4**.

#### Why It Matters
Operating systems arbitrate hardware access for every user application and security agent. Understanding how UEFI verifies early boot code, how the OS isolates processes via virtual memory, and how filesystems enforce metadata protects systems from persistent boot tampering and memory overlap.

#### Prerequisites & Connections
Building directly on **Computer Hardware, CPU, RAM & Storage**, this lesson unlocks **Virtualization & Cloud Basics**, **Linux Installation & File System**, **Windows Architecture & Registry**, **Digital Forensics Analysis**, and **C & Memory Foundations for Security**.

#### Core Explanation
From power-on to multi-tasking execution, OS architecture relies on four mechanisms:
- **BIOS vs. UEFI & Secure Boot:** Legacy BIOS reads the 512-byte Master Boot Record (MBR) without signature checks. Modern **UEFI** boots from an **EFI System Partition (ESP)** using GUID Partition Tables (GPT) and supports **Secure Boot**, which verifies cryptographic signatures on bootloaders and kernel drivers against trusted firmware certificates to block early bootkits.
- **Processes vs. Threads:** A **process** owns an isolated virtual memory address space managed by the OS kernel; **threads** execute concurrently *inside* that parent process and share its memory space.
- **Virtual Memory & MMU:** **OS Page Tables** paired with the CPU **Memory Management Unit (MMU)** translate each process's virtual addresses into physical DRAM frames, paging inactive memory to disk swap when RAM fills.
- **File Systems (\`NTFS\` vs. \`ext4\`):** Filesystems organize storage blocks, filenames, timestamps, and permissions. **NTFS** (standard on modern Windows) adds Access Control Lists (ACLs), journaling, compression, and EFS encryption; **ext4** is the dominant journaling Linux filesystem.

#### How It Works
At startup, UEFI checks the bootloader signature in the ESP against firmware keys, loads the OS kernel, mounts the root filesystem (\`ext4\` or \`NTFS\`), and initializes the MMU page tables. Every spawned application receives its own isolated virtual address space so a crash or bug in one program cannot corrupt another process's memory.

#### Real-World Context
Enabling **UEFI Secure Boot** across enterprise laptops alongside BitLocker TPM sealing ensures an attacker with temporary physical possession cannot boot a tampered kernel or inject an unsigned bootkit driver cleanly before OS security agents initialize.

#### Examples
Observing active OS processes, threads, and mounted filesystem types on Linux:
\`\`\`bash
# View interactive processes, threads, and memory footprint
htop

# Inspect mounted partitions alongside filesystem type (e.g., ext4, vfat)
df -hT
\`\`\`

#### Security Relevance
- **Defensive Value:** UEFI Secure Boot anchors boot integrity from silicon to kernel, while hardware MMU process isolation keeps unprivileged apps separated cleanly.
- **Attacker Misuse:** Advanced threats target legacy systems with Secure Boot disabled to install persistent bootkits/rootkits below OS visibility, or inject malicious threads inside legitimate running processes.

#### Common Mistakes
- Confusing **UEFI Secure Boot** (verifying early bootloader signatures) with Full Disk Encryption (confidentiality at rest)—both work together for distinct goals.
- Thinking threads have separate private memory spaces like independent processes do.
- Formatting internal Windows system volumes with FAT32/exFAT instead of **NTFS**, sacrificing ACL permissions and journaling.

#### Key Takeaways
- **UEFI Secure Boot** verifies cryptographic signatures on bootloaders and drivers before execution.
- **Processes** own isolated virtual memory spaces; **threads** share memory inside a parent process.
- The **MMU and OS Page Tables** map virtual addresses to physical RAM; **NTFS** provides modern ACLs and journaling on Windows.

#### Knowledge Check
- How does **Secure Boot** defend against tampered bootloaders differently from an antivirus scan inside the running OS?
- Why can two threads in the same process access shared variables directly while two separate processes cannot?
- Which Windows filesystem supports native ACLs, encryption, and compression features?

#### Further Learning
Explore UEFI Forum Secure Boot documentation and inspect your own OS kernel process tree (\`ps auxf\` on Linux or Task Manager Details on Windows).`,
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
- Distinguish **Type 1 bare-metal hypervisors** from **Type 2 hosted hypervisors**.
- Contrast **IaaS**, **PaaS**, and **SaaS** cloud service models and where security responsibility shifts under the **Shared Responsibility Model**.
- Compare **Public**, **Private**, and **Hybrid** cloud deployment topologies.

#### Why It Matters
Nearly every modern enterprise operates workloads on virtual machines and cloud platforms. Knowing whether the cloud provider or your security engineering team patches the OS, configures firewalls, or secures code depends completely on which virtualization layer and service model you adopt.

#### Prerequisites & Connections
Building directly on **System Boot & OS Architecture**, this lesson prepares you for **Hypervisors (VirtualBox, VMware, Hyper-V)** and underpins every Tier 4 Cloud Security module (**AWS Identity & Storage Security**, **Microsoft Azure Security**, **Google Cloud Platform (GCP) Security**).

#### Core Explanation
Cloud computing scales hardware abstraction globally:
- **Hypervisor Types:** A **Type 1 Bare-Metal Hypervisor** boots directly onto physical server hardware without a host OS for maximum throughput and isolation (e.g., ESXi, KVM, Hyper-V Server). A **Type 2 Hosted Hypervisor** runs as software atop a desktop OS like Windows or macOS (e.g., VirtualBox).
- **Cloud Service Models & Shared Responsibility:**
  - **IaaS (Infrastructure as a Service):** Delivers raw virtual VMs, storage, and VPC networking (e.g., AWS EC2). The *customer* patches and secures the guest OS, runtimes, and applications.
  - **PaaS (Platform as a Service):** Provider manages the OS, runtime patching, and database engine—allowing the customer to focus strictly on securing **application code and data**.
  - **SaaS (Software as a Service):** Turnkey applications accessed via browsers/APIs (e.g., Google Workspace, M365) where customers mainly manage user access, MFA, and data sharing.
- **Deployment Models:** **Public Cloud** (multi-tenant provider infrastructure isolated via hypervisors), **Private Cloud** (dedicated single-tenant corporate clusters), and **Hybrid Cloud** (interconnected on-premises + public cloud).

#### How It Works
In a Public Cloud datacenter, Type 1 hypervisors utilize CPU virtualization extensions (Intel VT-x / AMD-V) to partition physical servers safely among independent customer VMs. When your organization spins up a PaaS web app versus an IaaS VM, the provider's automation automatically keeps the underlying OS kernel patched under PaaS, while leaving guest OS hardening completely to you under IaaS.

#### Real-World Context
Many organizations migrating legacy VMs directly to cloud IaaS mistakenly assume "the cloud handles security now" and skip OS patching or host firewall rules—causing unpatched guest services to get compromised just like on-premises servers. Mapping controls accurately to IaaS vs. PaaS vs. SaaS prevents dangerous responsibility blind spots.

#### Examples
Mapping customer vs. provider security duties across cloud models:
\`\`\`text
Layer Managed       On-Premises   IaaS (EC2/VM)   PaaS (Managed App)   SaaS (Workspace)
------------------  ------------  --------------  -------------------  ----------------
Data & IAM Access   Customer      Customer        Customer             Customer
Application Code    Customer      Customer        Customer             Provider
OS & Patching       Customer      Customer        Provider             Provider
Physical Hardware   Customer      Provider        Provider             Provider
\`\`\`

#### Security Relevance
- **Defensive Value:** Choosing PaaS or managed SaaS reduces routine OS-patching toil dramatically when teams lack dedicated sysadmins, freeing capacity for IAM hardening and secure application code.
- **Attacker Misuse:** Attackers exploit the customer side of the Shared Responsibility gap—abusing unpatched IaaS guest VMs, overly permissive IAM tokens, or publicly shared SaaS folders.

#### Common Mistakes
- Assuming moving workloads to a **Public Cloud** transfers all security responsibility to AWS, Azure, or GCP.
- Confusing **PaaS** (provider patches OS/runtime; customer secures application code) with **IaaS** (customer manages OS and apps).
- Referring to **Type 2** desktop lab tools as bare-metal Type 1 enterprise hypervisors.

#### Key Takeaways
- **Type 1 hypervisors** run directly on bare metal; **Type 2** run atop a host operating system.
- **IaaS** offers raw virtual compute/storage/network; **PaaS** frees teams from managing the underlying OS/runtime so they focus on **application code**; **SaaS** delivers full web applications.
- **Public Cloud** isolates multi-tenant customers over shared internet infrastructure using hypervisors.

#### Knowledge Check
- Which cloud model eliminates customer responsibility for patching the Linux kernel yet leaves SQL query safety and app auth to the customer?
- Why do enterprise datacenters prefer Type 1 bare-metal hypervisors over Type 2 desktop hypervisors?
- What separates a **Public Cloud** deployment from a **Private Cloud**?

#### Further Learning
Review NIST SP 800-145 (*The NIST Definition of Cloud Computing*) and practice configuring isolated local lab VMs in **Hypervisors (VirtualBox, VMware, Hyper-V)**. `,
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
**Prerequisites:** Computer Hardware, CPU, RAM & Storage  

#### Learning Objectives
- Classify physical network scopes (**PAN**, **LAN**, **MAN**, **WAN**).
- Trace **Encapsulation** step-by-step down the **7-Layer OSI Model** (Application data -> Segment -> Packet -> Frame -> Bits).
- Map how the 4-layer **TCP/IP stack** aligns to OSI Layers 1–7 (especially combining L5–L7 into the TCP/IP Application Layer).

#### Why It Matters
Every firewall rule, Wireshark packet capture, VPN tunnel, and cyberattack happens at specific layers of the network stack. When you know exactly where MAC addresses live (Data Link Frames) versus IP addresses (Network Packets) versus ports (Transport Segments), troubleshooting and threat analysis become systematic instead of guesswork.

#### Prerequisites & Connections
Building on **Computer Hardware, CPU, RAM & Storage**, this foundational module unlocks **IP Addressing & Subnetting**, **Transport Protocols & Port Bindings**, **Defensive Frameworks & AAA**, **Wireless Security Vectors**, **Penetration Testing Methodologies**, **Symmetric & Asymmetric Encryption**, and **Network Automation & Scapy**.

#### Core Explanation
Network communication relies on standardized geographic scopes and layered protocol stacks:
- **Network Scopes:** **LAN (Local Area Network)** connects hosts inside a single building or office; **MAN** spans a city/campus; **WAN (Wide Area Network)** interconnects distant LANs globally (such as the Internet); **PAN** links personal nearby devices.
- **The 7-Layer OSI Model & Encapsulation:** As application bytes move down a sending host, each layer wraps its own header around the payload (**Encapsulation**):
  - **Layers 7–5 (Application, Presentation, Session):** Prepare application data (HTTP, DNS). Mapped together as the **Application Layer** in the 4-layer **TCP/IP Model**.
  - **Layer 4 (Transport):** Adds TCP/UDP port headers, forming a **Segment** (or datagram).
  - **Layer 3 (Network / TCP/IP Internet):** Adds logical source/destination IP headers, creating a **Packet**.
  - **Layer 2 (Data Link):** Adds hardware MAC address headers and error-checking trailers, creating a **Frame**.
  - **Layer 1 (Physical):** Transmits raw **Bits** over copper, fiber, or wireless radio waves.

#### How It Works
When your browser loads a webpage, HTTP payload passes down through TCP (adding destination port 443 -> Segment), IP (adding destination IP -> Packet), and Ethernet/Wi-Fi (adding local gateway MAC -> Frame) before hitting the network cable as Bits. Intermediate routers inspect only up to Layer 3 (Packet) to forward traffic, while the destination host unwraps (**de-encapsulates**) each header upward back into readable HTTP data.

#### Real-World Context
When SOC analysts diagnose an intrusion in Wireshark, layered visibility tells them instantly what happened: weird MAC changes indicate Layer 2 local LAN tampering (like ARP spoofing), anomalous public destinations show up in Layer 3 IP headers, and suspicious port numbers or payload strings appear in Layers 4 and 7.

#### Examples
Inspecting local Layer 2 MAC / Layer 3 IP interface bindings and tracing hops:
\`\`\`bash
# Show physical link MAC addresses and Layer 3 IP addresses on local adapters
ip addr show

# Trace Layer 3 router hops toward an external resolver
traceroute 1.1.1.1
\`\`\`

#### Security Relevance
- **Defensive Value:** Separating controls across layers—port security on Layer 2 switches, ACLs on Layer 3 routers, stateful filtering at Layer 4, and WAF/IDS inspection at Layer 7—builds true defense in depth.
- **Attacker Misuse:** Attackers exploit layer trust assumptions: Layer 2 MAC flooding and ARP poisoning never cross Layer 3 routers, while Layer 7 HTTP injection sails straight past Layer 4 port-443 firewall rules.

#### Common Mistakes
- Referring to every unit of network data as a "packet" when exams and Wireshark distinguish **Segments (L4)**, **Packets (L3)**, and **Frames (L2)**.
- Mapping TCP/IP's Application Layer strictly to OSI Layer 7 instead of **OSI Layers 5, 6, and 7 combined**.
- Confusing local switch MAC forwarding (Layer 2) with cross-subnet IP routing (Layer 3).

#### Key Takeaways
- **LANs** connect local offices or labs; **WANs** link networks across vast geographies.
- **Encapsulation** wraps headers down the **7-Layer OSI Model** to create **Segments (L4)**, **Packets (L3)**, **Frames (L2)**, and **Bits (L1)**.
- The **TCP/IP Application Layer** maps directly to **OSI Layers 5, 6, and 7**.

#### Knowledge Check
- What Protocol Data Unit (PDU) name applies specifically once Data Link MAC headers wrap a Network Layer Packet?
- How does the 4-layer TCP/IP stack consolidate the top three layers of the 7-layer OSI model?
- Why can an HTTP SQL Injection payload pass cleanly through a firewall rule permitting TCP port 443?

#### Further Learning
Continue directly to **IP Addressing & Subnetting** and inspect live OSI header nesting inside Wireshark or \`ip link\`.`,
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

**Difficulty:** Beginner  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Network Topologies, OSI & TCP/IP Reference models  

#### Learning Objectives
- Contrast 32-bit **IPv4** dotted-decimal addresses with 128-bit hexadecimal **IPv6** addresses.
- Calculate **Network ID**, **Broadcast Address**, and **usable host counts** from **CIDR** prefixes (\`/24\`, \`/26\`, \`/28\`) and dotted-decimal **Subnet Masks**.
- Design segmented logical subnets at Layer 3 of the **7-Layer OSI Model** to contain lateral blast radius.

#### Why It Matters
Misconfigured CIDR blocks in cloud VPCs, firewalls, or Scope of Work contracts cause severe outages or accidentally expose internal ranges to the whole internet. Subnetting fluency lets you read firewall rules, partition departments securely, and calculate exact address pools accurately in seconds.

#### Prerequisites & Connections
Building on **Network Topologies, OSI & TCP/IP Reference models**, this module supplies the addressing logic required for **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)** and **Routing, Switching & VLANs**.

#### Core Explanation
Logical Layer 3 addressing relies on four interrelated building blocks:
- **IPv4 vs. IPv6:** **IPv4** uses 32 bits formatted as four decimal octets (0–255 per octet, ~4.3 billion total addresses). **IPv6** uses **128 bits** written as eight colon-separated 4-hexadecimal-digit groups (such as \`2001:0db8:85a3:0000:0000:8a2e:0370:7334\`) to solve IPv4 exhaustion.
- **Subnet Mask:** Uses binary bitwise ANDing to divide every IPv4 address into two halves—the **Network ID** (high \`1\` bits) and the **Host ID** (trailing \`0\` bits).
- **CIDR Notation (\`/prefix\`):** Classless Inter-Domain Routing appends \`/N\` to state how many leading bits belong to the network prefix:
  - **\`/24\`** = \`255.255.255.0\` (8 host bits -> \`2^8 = 256\` total, minus Network ID & Broadcast = **254 usable hosts**).
  - **\`/26\`** = \`255.255.255.192\` (6 host bits -> last octet binary \`11000000 = 192\`, \`2^6 = 64\` total, **62 usable hosts**).

#### How It Works
Suppose your security team splits \`192.0.2.0/24\` into four smaller \`/26\` subnets: each subnet increments by \`64\` in the fourth octet (\`.0\`, \`.64\`, \`.128\`, \`.192\`). In the first block (\`192.0.2.0/26\`), \`.0\` is the reserved Network ID, \`.63\` is the Broadcast Address, and \`.1\`–\`.62\` are valid host assignments—giving routers unambiguous prefix boundaries for firewall ACLs.

#### Real-World Context
Security architects never drop databases, employee laptops, and public web servers inside one giant \`/16\` flat subnet. Partitioning each workload tier into dedicated \`/24\` or \`/26\` subnets makes stateful firewall rules precise and prevents lateral broadcast/scanning storms across departments.

#### Examples
Computing subnet bounds and usable IP pools cleanly via CLI:
\`\`\`bash
# Calculate exact network ID, netmask, broadcast, and host range for a /26 documentation block
ipcalc 192.0.2.0/26

# Quick binary check: /26 sets 2 bits in the 4th octet -> 128 + 64 = 192 (255.255.255.192)
\`\`\`

#### Security Relevance
- **Defensive Value:** Tight CIDR sizing enforces zero-trust segmentation—allowing database subnets to accept connections exclusively from the exact \`/26\` application-server subnet.
- **Attacker Misuse:** Attackers landing on an unsegmented corporate \`/16\` network sweep 65,000+ hosts trivially in minutes, whereas tight subnet ACLs block east-west lateral scans immediately.

#### Common Mistakes
- Forgetting to subtract **2 reserved addresses** (Network ID + Broadcast Address) when counting usable IPv4 hosts (\`2^host_bits - 2\`).
- Miswriting \`/26\` as \`255.255.255.26\` or confusing \`.128\` (\`/25\`) with \`.192\` (\`/26\`).
- Using public routable IP typos (like octets \`> 255\`) or confusing MAC hex colons with 128-bit IPv6 representations.

#### Key Takeaways
- A **\`/24\`** subnet leaves 8 host bits (**254 usable hosts**); a **\`/26\`** subnet maps to mask **\`255.255.255.192\`** (62 usable hosts).
- **Subnet Masks** separate **Network ID** bits from **Host ID** bits.
- **IPv6** expands logical addressing to **128-bit hexadecimal blocks** separated by colons.

#### Knowledge Check
- Why does a \`/24\` IPv4 network yield **254** usable host addresses instead of 256?
- Convert CIDR \`/26\` into its dotted-decimal Subnet Mask and explain the binary math in the fourth octet.
- How many bits are in an IPv6 address compared to an IPv4 address?

#### Further Learning
Practice subnet calculations with \`ipcalc\` on Linux or test RFC 1918 vs. RFC 5737 documentation block allocations in **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)**.`,
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
          content: `### Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** IP Addressing & Subnetting  

#### Learning Objectives
- Trace dynamic host address assignment via the **DHCP DORA handshake** (\`Discover -> Offer -> Request -> Acknowledge\`).
- Explain recursive and authoritative name resolution in **DNS** (**UDP Port 53**, plus TCP 53 for large zone transfers/DNSSEC).
- Contrast **NAT** (RFC 1918 private-to-public IP translation), **ARP** (IP-to-MAC resolution), and **ICMP** reachability diagnostics.

#### Why It Matters
Without helper protocols running quietly underneath applications, no device could obtain an IP address automatically, resolve \`example.com\`, reach a local default gateway MAC address, or share public internet connections. Because several of these legacy protocols lack built-in authentication, they are prime targets for spoofing and hijacking—making defensive hardening essential.

#### Prerequisites & Connections
Building directly on **IP Addressing & Subnetting**, this module unlocks **HTTP, Web Architecture & Browser Trust**, **Routing, Switching & VLANs**, **Network Defense**, **Email Protocols, Authentication & Phishing Defense**, and **Open Source Intelligence & Passive Recon**.

#### Core Explanation
Five essential infrastructure helpers connect subnets and hostnames:
- **DHCP (Dynamic Host Configuration Protocol):** Leases IP addresses, subnet masks, default gateways, and DNS servers automatically over UDP Ports 67/68 via the 4-step **DORA handshake**: **Discover** (client broadcast) -> **Offer** (server lease) -> **Request** (client selection) -> **Acknowledge** (server confirmation).
- **DNS (Domain Name System):** Translates human-readable domain names into IP addresses primarily over lightweight **UDP Port 53** (switching to TCP 53 for large responses or zone transfers), traversing Root, TLD, and Authoritative servers.
- **ARP (Address Resolution Protocol):** Maps a destination **Layer 3 IP address** to its physical **Layer 2 MAC address** on local broadcast segments.
- **NAT (Network Address Translation):** Translates internal RFC 1918 private IP ranges (\`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`) into shared public WAN IP addresses.
- **ICMP (Internet Control Message Protocol):** Transmits network status feedback and diagnostics (such as \`ping\` Echo Request/Reply and \`traceroute\` Time Exceeded).

#### How It Works
When you plug a new laptop into an office VLAN, it broadcasts a **DHCP Discover** to receive an IP lease via the **DORA** sequence. To reach \`portal.example.com\`, it checks local ARP for its gateway router's MAC address and sends a **DNS** query on **UDP Port 53** for the server's \`A\`/\`AAAA\` record, while the perimeter router performs **NAT** so internal private addresses share the company's public IP cleanly.

#### Real-World Context
On unmanaged Layer 2 switches, an attacker plugged into a conference-room jack can broadcast forged **ARP** replies (ARP Spoofing) or spin up a **Rogue DHCP server** to hijack local traffic as a Man-in-the-Middle. Enterprise networks counter this directly with **DHCP Snooping**, **Dynamic ARP Inspection (DAI)**, and **DNSSEC** cryptographic validation.

#### Examples
Diagnosing name resolution, local ARP bindings, and ICMP reachability safely in a lab terminal:
\`\`\`bash
# Trace authoritative DNS delegation for a domain
dig +trace example.com

# Inspect local IP-to-MAC Address Resolution Protocol cache
arp -a

# Verify basic Layer 3 ICMP reachability cleanly
ping -c 4 192.0.2.1
\`\`\`

#### Security Relevance
- **Defensive Value:** Enabling **DNSSEC**, **DHCP Snooping**, **Dynamic ARP Inspection**, and outbound DNS logging turns fragile broadcast helpers into monitored, tamper-resistant infrastructure.
- **Attacker Misuse:** Threat actors exploit unauthenticated DNS for cache poisoning or C2 tunneling, run ARP poisoning on shared Wi-Fi/LANs, and abuse open DNS/ICMP reflectors for amplification DDoS.

#### Common Mistakes
- Confusing **DNS** (name -> IP, UDP Port 53) with **ARP** (IP -> local physical MAC address).
- Thinking NAT alone provides a full stateful firewall rather than simple address/port translation.
- Forgetting the chronological order of the DHCP **DORA** handshake (**Discover, Offer, Request, Acknowledge**).

#### Key Takeaways
- **DHCP** leases IP settings automatically using the **DORA handshake** (Discover, Offer, Request, Acknowledge).
- **DNS** resolves hostnames to IP addresses primarily via **UDP Port 53**; **ARP** maps IP addresses to **MAC addresses** on LANs.
- **NAT** shares public WAN IP addresses across internal **RFC 1918** private subnets.

#### Knowledge Check
- Walk through the four messages of a DHCP **DORA** exchange from client plug-in to IP confirmation.
- Why does a workstation need **ARP** even after DNS returns the web server's public IP address?
- Which protocol and port handles standard fast DNS queries?

#### Further Learning
Explore **DNSSEC** record verification with \`dig +dnssec\` and inspect how switches enforce DHCP Snooping and DAI in **Routing, Switching & VLANs**.`,
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

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Network Topologies, OSI & TCP/IP Reference models  

#### Learning Objectives
- Trace the **TCP Three-Way Handshake** (\`SYN -> SYN-ACK -> ACK\`) and graceful connection teardown (\`FIN\` / \`RST\`).
- Compare connection-oriented **TCP** reliability with lightweight connectionless **UDP** datagrams.
- Audit open listening sockets via \`ss -tuln\` and memorize critical service port bindings (**SSH 22/TCP**, **DNS 53/UDP**, **HTTP 80/TCP**, **HTTPS 443/TCP**, **SMB 445/TCP**).

#### Why It Matters
Network ports separate concurrent applications running on the same IP address—letting one server expose HTTPS, accept remote SSH admin logins, or accidentally leak an unencrypted database port globally. Auditing transport states and port bindings shows defenders and pentesters alike what services are reachable.

#### Prerequisites & Connections
Building on **Network Topologies, OSI & TCP/IP Reference models** (with **IP Addressing & Subnetting** recommended alongside it), this lesson unlocks **HTTP, Web Architecture & Browser Trust**, **Secure Tunnels & Perimeter Defense**, **Active Reconnaissance & Port Scanning**, and **Transport Layer Security (TLS/SSL)**.

#### Core Explanation
Layer 4 transports multiplex streams across 65,536 port numbers (Well-Known \`0–1023\`, Registered \`1024–49151\`, Dynamic/Ephemeral \`49152–65535\`):
- **TCP (Transmission Control Protocol):** Connection-oriented transport guaranteeing ordered, lossless delivery via sequence numbers, acknowledgments, and window flow control. Sessions initialize cleanly with the **TCP Three-Way Handshake**: client sends **\`SYN\`**, server replies **\`SYN-ACK\`**, and client returns **\`ACK\`**.
- **UDP (User Datagram Protocol):** Connectionless, minimal-header datagram delivery without handshake latency or retransmissions—ideal for live video/audio streaming, VoIP, gaming, and rapid single-packet DNS lookups.
- **High-Yield Service Ports:** **TCP 22** (SSH), **TCP 23** (legacy plaintext Telnet), **UDP/TCP 53** (DNS), **TCP 80** (HTTP), **TCP 443** (HTTPS), **TCP 445** (SMB), **TCP 3306** (MySQL), **TCP 3389** (RDP).

#### How It Works
Before a web browser or SSH client exchanges application bytes, the kernel opens an ephemeral source port (e.g., \`51422\`) and completes the \`SYN -> SYN-ACK -> ACK\` handshake toward destination port \`443\` or \`22\`. On servers, binding listeners strictly to \`127.0.0.1\` keeps internal databases local, whereas binding to \`0.0.0.0\` exposes the port across all host network interfaces.

#### Real-World Context
Running \`ss -tuln\` routinely catches costly configuration mistakes before an attacker finds them—for instance spotting an old unencrypted Telnet daemon (\`0.0.0.0:23\`) left open or a backend database bound to \`0.0.0.0:3306\` instead of loopback \`127.0.0.1:3306\`.

#### Examples
Auditing listening TCP and UDP sockets and process bindings on Linux:
\`\`\`bash
# Display listening (-l) TCP (-t) & UDP (-u) sockets numerically (-n) with process IDs (-p)
sudo ss -tuln -p
\`\`\`

#### Security Relevance
- **Defensive Value:** Auditing active sockets regularly lets administrators close unnecessary ports, migrate plaintext services (Telnet/FTP/HTTP) to encrypted equivalents (SSH/SFTP/HTTPS), and confirm internal databases stay bound strictly to private or loopback addresses.
- **Attacker Misuse:** Threat actors flood half-open TCP handshakes (**SYN Flooding**) to exhaust server connection tables, or sweep common TCP/UDP ports looking for exposed remote shells and databases.

#### Common Mistakes
- Confusing the **TCP Three-Way Handshake** (\`SYN -> SYN-ACK -> ACK\`) with DHCP's DORA exchange or TLS negotiation.
- Assuming UDP is insecure just because it lacks handshakes—security comes from encryption (DTLS, QUIC, WireGuard) and authentication rather than TCP reliability alone.
- Leaving services bound on \`0.0.0.0\` when only local \`127.0.0.1\` access is needed.

#### Key Takeaways
- A standard **TCP Three-Way Handshake** follows **\`SYN -> SYN-ACK -> ACK\`**.
- **UDP** trades connection setup and retransmission overhead for **low-latency** real-time streaming and quick lookups.
- **SSH** uses **Port 22 / TCP**, **HTTPS** uses **Port 443 / TCP**, and **\`sudo ss -tuln\`** reveals active listening sockets.

#### Knowledge Check
- Trace the three flags sent in chronological order when establishing a TCP session.
- Why would a real-time VoIP voice call choose **UDP** over **TCP**?
- What is the security difference between a service listening on \`127.0.0.1:3306\` versus \`0.0.0.0:3306\`?

#### Further Learning
Continue directly to **HTTP, Web Architecture & Browser Trust** and test socket inspection interactively inside this lesson's **Practice Lab**.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** IP Addressing & Subnetting, Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)  

#### Learning Objectives
- Trace Layer 2 Ethernet forwarding using a switch's **CAM (MAC Address) Table** and unknown-unicast flooding behavior.
- Explain **Layer 3 IP routing** across distinct subnets using routing tables and default gateways.
- Segment broadcast domains cleanly using **VLANs** (802.1Q tagging) and controlled Inter-VLAN ACLs.

#### Why It Matters
Flat corporate networks allow a single infected visitor laptop to sniff ARP broadcasts and sweep every server on the LAN. Understanding how Layer 2 switches learn hardware addresses, isolate traffic inside VLANs, and require Layer 3 routers to cross zones lets engineers enforce real internal segmentation.

#### Prerequisites & Connections
This module extends **IP Addressing & Subnetting** and **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)**, leading directly into **Secure Tunnels & Perimeter Defense (VPN, Firewalls, Proxy Servers)**.

#### Core Explanation
Local infrastructure separates intra-LAN frame switching from cross-subnet routing:
- **Layer 2 Switching & CAM Tables:** Switches maintain a **Content Addressable Memory (CAM)** table mapping each connected host's physical MAC address to a specific physical switch port. When a switch receives a frame whose destination MAC is *not yet in its CAM table*, it **floods** that frame out all other ports belonging to the same VLAN to locate the destination.
- **Layer 3 Routing:** Routers (and Layer 3 switches) operate at **OSI Layer 3 (Network)**, inspecting destination IP headers against routing tables and Access Control Lists (ACLs) to move packets between different IP subnets.
- **VLANs (Virtual Local Area Networks):** Partition a single physical switch into multiple isolated logical **broadcast domains**. Hosts in Finance VLAN 10 cannot reach Guest VLAN 20 at Layer 2—traffic must traverse a **Layer 3 Router/Firewall** enforcing Inter-VLAN security rules.

#### How It Works
Suppose a workstation on VLAN 10 sends a packet toward a database server on VLAN 30. The local access switch forwards the Ethernet frame at Layer 2 using its CAM table solely to the gateway router's trunk interface (carrying an IEEE 802.1Q VLAN tag). The router checks Layer 3 ACLs, strips/swaps the VLAN tag, and forwards the packet into VLAN 30 only if policy permits.

#### Real-World Context
Without switch port security, an attacker can flood thousands of forged source MAC addresses onto a switch port (**MAC Flooding**), overflowing the CAM table so the switch degrades into hub-like flooding—leaking unicast frames across ports. Limiting learned MAC counts per port plus enabling VLAN segmentation stops this cold.

#### Examples
Inspecting local Linux routing tables and neighbor MAC mappings:
\`\`\`bash
# Display the Layer 3 IP routing table and default gateway interface
ip route show

# Display the local Layer 2 neighbor / MAC lookup table
ip neigh show
\`\`\`

#### Security Relevance
- **Defensive Value:** Separating Guest Wi-Fi, Corporate Workstations, Management Interfaces, and Production Servers into distinct VLANs governed by Layer 3 firewall rules shrinks lateral movement drastically.
- **Attacker Misuse:** Adversaries attempt VLAN hopping (abusing misconfigured DTP auto-trunking or native VLAN 1 defaults), MAC flooding, and ARP spoofing when Layer 2 switch hardening is neglected.

#### Common Mistakes
- Assuming putting devices on the same physical switch in different IP ranges isolates them cleanly without assigning separate **VLANs**.
- Leaving switch ports set to automatic trunk negotiation or default Native VLAN 1.
- Thinking Layer 2 switches evaluate IP subnet ACLs by default instead of Layer 3 routers/L3 switches.

#### Key Takeaways
- Layer 2 switches forward frames using a **CAM / MAC Address table**—and **flood unknown unicast frames** out all other ports in that VLAN.
- **VLANs** isolate switches into separate Layer 2 **broadcast domains**; cross-VLAN communication requires **Layer 3 Routing**.
- Inter-VLAN routers/firewalls provide the policy enforcement checkpoint between segmented zones.

#### Knowledge Check
- What happens inside a VLAN the instant a Layer 2 switch receives an Ethernet frame for a destination MAC address absent from its CAM table?
- Why does separating Staff laptops (VLAN 10) and Guest laptops (VLAN 20) prevent guest users from sniffing staff ARP traffic?
- Which OSI layer device connects VLAN 10 to VLAN 20 while enforcing ACL policies?

#### Further Learning
Review IEEE 802.1Q VLAN trunking security recommendations and test VLAN ACL enforcement inside **Secure Tunnels & Perimeter Defense**.`,
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
          content: `### Secure Tunnels & Perimeter Defense (VPN, Firewalls, Proxy Servers)

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Transport Protocols & Port Bindings, Routing, Switching & VLANs  

#### Learning Objectives
- Contrast **Stateful Packet Inspection (SPI)** firewalls and **Implicit Deny** default postures against stateless filters.
- Differentiate **Forward Proxies** (client-side egress control) from **Reverse Proxies** (server-side TLS termination, load balancing, and shielding).
- Compare encrypted VPN protocols including kernel-native **WireGuard** (Noise framework / ChaCha20), IPsec, and OpenVPN.

#### Why It Matters
Internal segments and public applications depend on strict perimeter checkpoints: firewalls control which flows cross network boundaries, proxies isolate clients and servers from direct exposure, and VPNs extend private corporate trust safely across untrusted coffee-shop or ISP links.

#### Prerequisites & Connections
Building directly on **Transport Protocols & Port Bindings** and **Routing, Switching & VLANs**, this module prepares you directly for **HTTP, Web Architecture & Browser Trust** (Reverse Proxies/TLS) and Tier 2 **Network Defense (IDS/IPS, Snort, Suricata, Wireshark)**.

#### Core Explanation
Network boundary enforcement integrates three complementary controls:
- **Stateful Firewalls & Implicit Deny:** Unlike stateless packet filters evaluating every packet in isolation, **Stateful Packet Inspection (SPI)** tracks active connection state tables so return replies match legitimate outbound requests automatically. Production policies follow **Implicit Deny**: drop everything by default unless matched by an explicit allow rule (evaluated strictly top-to-bottom!).
- **Forward vs. Reverse Proxies:**
  - **Forward Proxy:** Sits beside *clients* to filter outbound web traffic, enforce acceptable-use policies, and shield internal client IPs.
  - **Reverse Proxy:** Sits directly in front of *backend servers* to terminate SSL/TLS connections, balance load, cache responses, and hide internal server topology from the internet.
- **VPN Tunnels:** Create cryptographically authenticated, encrypted overlays across public networks—modern **WireGuard** runs natively inside the Linux kernel using concise, auditable cryptography (Noise protocol, ChaCha20, Curve25519), superseding legacy broken PPTP or SSL v3.

#### How It Works
Firewall chains evaluate rules strictly sequentially from line 1 downward and **stop on the very first match**. Placing a broad \`allow port 22 from any\` rule above a restricted \`allow port 22 from 192.0.2.100/32\` rule silently overrides the restriction—illustrating why rule ordering and explicit \`DROP\` defaults must be audited continually.

#### Real-World Context
Modern Zero Trust architectures pair **Reverse Proxies** (terminating TLS 1.3 and validating OAuth/OIDC session headers before traffic ever touches backend microservices) with **WireGuard / IPsec** site tunnels and host-level \`nftables\` rules blocking unexpected lateral connections.

#### Examples
Inspecting Linux host firewall rulesets cleanly with \`nftables\` or \`iptables\`:
\`\`\`bash
# Inspect active modern Linux nftables ruleset
sudo nft list ruleset

# Inspect legacy iptables rules numerically without slow DNS resolution
sudo iptables -L -n -v
\`\`\`

#### Security Relevance
- **Defensive Value:** Combining Implicit Deny stateful firewalls, Reverse Proxy isolation, and modern WireGuard/IPsec tunnels creates resilient network perimeters resistant to unsolicited probing and transit eavesdropping.
- **Attacker Misuse:** Attackers exploit rule-ordering shadows (broad early \`ACCEPT\` rules bypassing later admin IP restrictions), split-tunnel VPN leaks, and legacy exposed PPTP/IPsec gateways.

#### Common Mistakes
- Placing specific restrictive IP rules *below* broad port \`ACCEPT\` rules in top-to-bottom firewall chains.
- Confusing a **Forward Proxy** (outbound client broker) with a **Reverse Proxy** (inbound server shield).
- Choosing deprecated legacy VPN protocols (like PPTP) instead of **WireGuard** or hardened IKEv2/IPsec.

#### Key Takeaways
- **Stateful Packet Inspection (SPI)** tracks active connection states to permit matched return traffic while dropping unsolicited packets under **Implicit Deny**.
- A **Reverse Proxy** sits in front of backend servers for TLS termination, caching, and load balancing.
- **WireGuard** is a high-performance, kernel-native Linux VPN built on modern cryptography (Noise framework, ChaCha20).

#### Knowledge Check
- Why does top-to-bottom rule evaluation break admin IP filtering if an unconditional \`ACCEPT port 22\` line appears above the restricted rule?
- Where does a **Reverse Proxy** sit relative to web browsers and backend application servers?
- Why is **Implicit Deny** the foundational rule posture for firewall chains?

#### Further Learning
Continue to **HTTP, Web Architecture & Browser Trust** to see how Reverse Proxies handle HTTP routing, TLS termination, and browser security headers.`,
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
        },
        {
          id: 'http-web-arch',
          title: 'HTTP, Web Architecture & Browser Trust',
          description: 'Master HTTP/1.1–3 semantics, headers, status codes, reverse proxies, Same-Origin Policy, CORS, and browser security headers.',
          duration: '18 mins',
          content: `### HTTP, Web Architecture & Browser Trust

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP), Transport Protocols & Port Bindings  

#### Learning Objectives
- Dissect HTTP/1.1, HTTP/2, and HTTP/3 request/response anatomy under **RFC 9110** (methods, \`2xx/3xx/4xx/5xx\` status codes, core headers).
- Trace modern web delivery paths through DNS, TLS termination, **CDNs / Reverse Proxies**, and backend application servers.
- Contrast **Same-Origin Policy (SOP)** (*scheme + host + port*) with **CORS**, and configure browser defense headers (**CSP**, **HSTS**, \`X-Content-Type-Options\`).

#### Why It Matters
Almost every enterprise portal, REST API, and cloud dashboard runs over HTTP/HTTPS inside web browsers. If you don't understand how headers travel across reverse proxies or why browsers enforce Same-Origin Policy versus CORS, web vulnerabilities like XSS, CSRF, SSRF, and session hijacking look like magic tricks instead of predictable protocol flaws.

#### Prerequisites & Connections
This foundational module connects **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)** and **Transport Protocols & Port Bindings** (plus **Network Topologies, OSI & TCP/IP Reference models** as recommended context). It directly unlocks Tier 2 **Authentication, Sessions & Identity Protocols**, Tier 3 **Web Technologies & OWASP Top 10**, and supports **Transport Layer Security (TLS/SSL)** and **Network Automation & Scapy**.

#### Core Explanation
Web applications depend on HTTP protocol semantics and strict browser trust boundaries:
- **HTTP Versions (RFC 9110 Semantics):** Text-oriented **HTTP/1.1** opens sequential requests per TCP connection; **HTTP/2** multiplexes binary streams over a single TLS connection; **HTTP/3** replaces TCP with UDP-based **QUIC** to eliminate head-of-line packet blocking.
- **Request & Response Anatomy:** Clients transmit an **HTTP Method** (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`), path, version, and headers (\`Host\`, \`Authorization\`, \`Cookie\`). Servers answer with numeric status codes: **\`2xx\`** (success), **\`3xx\`** (redirect), **\`4xx\`** (client error such as \`401\` Unauthorized or \`403\` Forbidden), and **\`5xx\`** (server error), plus headers like \`Set-Cookie\` and **\`Content-Security-Policy\`**.
- **Reverse Proxies & CDNs:** Edge proxies terminate TLS, route requests by \`Host\` header, cache public assets, and forward requests over private links to origin APIs.
- **Same-Origin Policy (SOP) vs. CORS:** Browsers isolate websites strictly by **Origin = exact Scheme + Hostname + Port** (so \`https://app.example.com:443\` and \`http://app.example.com\` are *different* origins). **Cross-Origin Resource Sharing (CORS)** uses server-returned headers (like \`Access-Control-Allow-Origin\`) to grant *explicit* cross-origin JavaScript read exceptions safely—never wildcards (\`*\`) paired with credentials.
- **Hardening Headers:** **HSTS** (\`Strict-Transport-Security\`) prevents insecure HTTP downgrades; **CSP** restricts where scripts/frames load; \`X-Content-Type-Options: nosniff\` stops MIME-type confusion.

#### How It Works
When your browser requests an API endpoint at \`https://api.example.com/profile\` from a page loaded at \`https://portal.example.com\`, the origins differ (\`api.\` vs. \`portal.\`). The browser enforces **SOP** and triggers a preflight or inspects CORS headers on the response. Only if the backend explicitly lists \`Access-Control-Allow-Origin: https://portal.example.com\` (never trusting arbitrary incoming \`Origin\` headers blindly!) may JavaScript read the response body.

#### Real-World Context
A frequent API security bug occurs when developers reflect whatever \`Origin\` header an incoming browser sends straight back into \`Access-Control-Allow-Origin\` alongside \`Access-Control-Allow-Credentials: true\`. That misconfiguration completely neutralizes the browser's Same-Origin Policy, allowing any malicious website the user visits in another tab to read private authenticated API responses.

#### Examples
Comparing a hardened HTTPS response against an unsafe CORS reflection:
\`\`\`http
HTTP/1.1 200 OK
Content-Type: application/json
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Access-Control-Allow-Origin: https://portal.example.com
Vary: Origin
\`\`\`

#### Security Relevance
- **Defensive Value:** Strict Origin validation, explicit CORS allowlists, CSP script/frame constraints, HSTS preload, and \`nosniff\` harden both server endpoints and user browsers simultaneously.
- **Attacker Misuse:** Attackers exploit permissive \`Access-Control-Allow-Origin: *\` or dynamic Origin reflection to steal data cross-site, downgrade plaintext HTTP sessions without HSTS, and abuse reverse-proxy header parsing mismatches (HTTP Request Smuggling).

#### Common Mistakes
- Thinking **CORS** blocks malicious browsers from sending requests—CORS restricts which cross-origin responses *JavaScript* can read; state-changing requests still require CSRF defenses!
- Treating \`http://example.com\` and \`https://example.com\` as the same Origin (scheme differs -> distinct origins!).
- Using \`Access-Control-Allow-Origin: *\` or echoing unvalidated \`Origin\` headers with credentials enabled.

#### Key Takeaways
- A browser **Origin** is defined strictly by **Scheme + Hostname + Port**.
- **Same-Origin Policy (SOP)** blocks scripts on one origin from reading responses from another unless explicit **CORS** policy allows it.
- Security response headers—**CSP**, **HSTS**, and **\`X-Content-Type-Options: nosniff\`**—harden browsers against script injection and protocol downgrades.

#### Knowledge Check
- Do \`https://portal.example.com\` and \`https://portal.example.com:8443\` share the same Origin under the Same-Origin Policy? Why or why not?
- Why is blindly reflecting any incoming \`Origin\` header into \`Access-Control-Allow-Origin\` with \`Allow-Credentials: true\` dangerous?
- What transport protocol powers **HTTP/3** instead of classic TCP?

#### Further Learning
Read **RFC 9110 (HTTP Semantics)** overview and inspect live response headers inside your browser's Network DevTools panel.`,
          quiz: [
            {
              id: 'q-http-1',
              question: 'Which three URL components strictly define an "Origin" under the browser Same-Origin Policy (SOP)?',
              options: [
                "Hostname, URI Path, and Query Parameters",
                "IP Address, User-Agent String, and TLS Version",
                "Scheme (Protocol), Hostname, and Port",
                "Domain Name, Session Cookie, and HTTP Method"
              ],
              correctOption: 2,
              explanation: 'Two URLs share the same Origin only when their scheme (http vs https), exact host, and TCP/UDP port number all match.'
            },
            {
              id: 'q-http-2',
              question: 'What is the primary security purpose of the Strict-Transport-Security (HSTS) HTTP response header?',
              options: [
                "It forces browsers to connect exclusively over HTTPS, blocking downgrades.",
                "It restricts which third-party JavaScript domains may call fetch() APIs.",
                "It replaces symmetric AES session keys on every HTTP POST request.",
                "It instructs backend reverse proxies to strip client IP addresses."
              ],
              correctOption: 0,
              explanation: 'HSTS caches an HTTPS-only policy in the browser so subsequent requests automatically upgrade to HTTPS, mitigating SSL-stripping attacks.'
            },
            {
              id: 'q-http-3',
              question: 'Which HTTP response status code range indicates that the client submitted an invalid or unauthorized request (e.g., 401 or 403)?',
              options: [
                "1xx Informational",
                "2xx Success",
                "3xx Redirection",
                "4xx Client Error"
              ],
              correctOption: 3,
              explanation: '4xx status codes (like 400 Bad Request, 401 Unauthorized, and 403 Forbidden) indicate client-side request or authorization failures.'
            },
            {
              id: 'q-http-4',
              question: 'Why does returning Access-Control-Allow-Credentials: true while reflecting arbitrary incoming Origin headers break web API security?',
              options: [
                "It forces backend reverse proxies to cache private database payloads publicly.",
                "It allows any external malicious site to read authenticated user responses.",
                "It disables TLS certificate validation inside the client browser.",
                "It prevents legitimate same-origin login forms from submitting cookies."
              ],
              correctOption: 1,
              explanation: 'Allowing arbitrary origins alongside credentials lets attacker-controlled sites make credentialed cross-origin requests and read sensitive JSON responses.'
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
**Prerequisites:** System Boot & OS Architecture  

#### Learning Objectives
- Navigate the unified **Root Directory (\`/\`)** under the **Filesystem Hierarchy Standard (FHS)**.
- Identify critical directories: \`/etc\`, \`/var\`, \`/bin\`/\`/sbin\`, \`/dev\`, and virtual runtime memory filesystem \`/proc\`.
- Inspect attached block partitions and secure mount options (\`noexec\`, \`nosuid\`) using \`mount\`.

#### Why It Matters
Unlike Windows drive letters, Linux unifies every disk partition, configuration text file, hardware device, and live kernel process table beneath a single tree rooted at \`/\`. Knowing immediately where configs (\`/etc\`), logs (\`/var/log\`), and kernel runtime telemetry (\`/proc\`) reside turns unfamiliar servers into transparent workspaces.

#### Prerequisites & Connections
Building directly on **System Boot & OS Architecture**, this lesson unlocks **Access Control & Permissions (chmod, chown, sudo)** and supports **Containerization (Docker, Docker Images, Docker Containers, Docker Compose)**.

#### Core Explanation
Linux administration starts with the unified **FHS** hierarchy rooted at **\`/\`**:
- **\`/etc\`:** Central plain-text system and service configuration files (e.g., \`/etc/passwd\`, \`/etc/ssh/sshd_config\`).
- **\`/var\`:** Variable state data, package caches, and crucial audit logs inside **\`/var/log\`**.
- **\`/bin\` & \`/sbin\`:** Essential user and administrative system binaries.
- **\`/dev\`:** Virtual device nodes representing physical hardware disks and peripherals (such as \`/dev/nvme0n1\`).
- **\`/proc\`:** Dynamic **pseudo-filesystem** generated in RAM exposing live kernel state, memory maps, and running Process IDs (\`/proc/<pid>/\`).
- **\`mount\`:** Attaches physical partitions or virtual filesystems onto directory paths in the root tree, enforcing security flags like \`noexec\` or \`nosuid\` on temporary folders like \`/tmp\`.

#### How It Works
At boot, the kernel mounts the root ext4 filesystem read-write, attaches \`/proc\` and \`/dev\` virtual trees in memory, reads service configs out of \`/etc\`, and mounts additional partitions listed in \`/etc/fstab\`. Hardening \`/tmp\` with \`nosuid,nodev,noexec\` prevents users from executing dropped binaries directly from world-writable temp space.

#### Real-World Context
Incident responders routinely inspect \`/proc/<pid>/exe\` and \`/proc/<pid>/cmdline\` when suspecting malware deleted its original executable off disk—because Linux keeps the running process's open file descriptor accessible inside virtual \`/proc\` memory even after \`rm\` unlinks the filename.

#### Examples
Exploring root configurations and mounted partitions cleanly in a terminal:
\`\`\`bash
# Confirm current working path
pwd

# List system configuration files inside /etc
ls -la /etc

# Inspect mounted physical block devices and mount hardening options
mount | grep '^/dev'
\`\`\`

#### Security Relevance
- **Defensive Value:** Mounting \`/tmp\` and \`/var/tmp\` with \`noexec,nosuid,nodev\`, monitoring \`/etc\` integrity with AIDE, and inspecting \`/proc\` process trees form baseline Linux host hardening.
- **Attacker Misuse:** Attackers hide staging scripts inside world-writable \`/tmp\` or \`/dev/shm\`, modify cron/startup scripts in \`/etc\`, or scrub logs out of \`/var/log\`.

#### Common Mistakes
- Confusing \`/etc\` (system configuration files) with \`/var\` (logs and variable state) or \`/dev\` (hardware device nodes).
- Expecting \`/proc\` files to consume physical hard-drive space—they are virtual kernel interfaces generated dynamically in RAM.
- Mounting temporary or user-writable partitions without \`noexec\` and \`nosuid\` hardening flags.

#### Key Takeaways
- Linux unifies storage beneath **\`/\`** (Root Directory): **\`/etc\`** stores configs, **\`/dev\`** holds device nodes, **\`/var\`** stores logs/state, and **\`/proc\`** exposes live kernel/process RAM telemetry.
- The **\`mount\`** command attaches disk partitions onto target folders in the hierarchy.

#### Knowledge Check
- Which directory stores plain-text configuration files like \`/etc/hosts\` and \`/etc/ssh/sshd_config\`?
- How does \`/proc\` differ structurally from \`/etc\` or \`/var\`?
- Why is mounting \`/tmp\` with \`noexec,nosuid\` recommended in Linux hardening benchmarks?

#### Further Learning
Continue straight to **Access Control & Permissions (chmod, chown, sudo)** and practice filesystem navigation in this lesson's **Practice Lab**.`,
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
          content: `### Access Control & Permissions (chmod, chown, sudo)

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Linux Installation & File System  

#### Learning Objectives
- Decode symbolic permission masks (\`drwxr-xr-x\`) across Owner, Group, and Others.
- Convert Read (\`4\`), Write (\`2\`), and Execute (\`1\`) permission bits into octal modes with \`chmod\` (such as \`600\` for private keys and \`755\` for scripts).
- Manage file ownership via \`chown\` and least-privilege elevation rules in \`/etc/sudoers\` (via \`visudo\`).

#### Why It Matters
Single permission mistakes—such as leaving an SSH private key readable by other users (\`644\`), making a configuration script world-writable (\`777\`), or granting wildcard \`sudo\` rights—turn minor account compromises into instant root takeovers.

#### Prerequisites & Connections
Building directly on **Linux Installation & File System**, this module unlocks **Bash Shell & Core Scripting**, **Stream Editing & File Inspection**, **Archiving & System Services**, Tier 2 **Defensive Frameworks & AAA**, and Tier 3 **Password Auditing & Cracking** and **Privilege Escalation**.

#### Core Explanation
Linux POSIX access control evaluates every file operation against ownership and nine permission bits:
- **Reading \`ls -la\` Output:** The leading character identifies entry type (**\`-\`** file, **\`d\`** directory, **\`l\`** symlink). The next 9 characters divide into **Owner (3)**, **Group (3)**, and **Others (3)** using **Read (\`r=4\`)**, **Write (\`w=2\`)**, and **Execute (\`x=1\`)**.
- **Octal Conversion & \`chmod\`:** Sum each trio: \`rwxr-xr-x\` = \`7\` (\`4+2+1\`), \`5\` (\`4+1\`), \`5\` (\`4+1\`) = **\`755\`**. Private keys (such as SSH \`id_rsa\`) require **\`600\`** (Owner Read/Write only; \`0\` for Group and Others), which SSH refuses to use otherwise.
- **\`chown\`:** Updates owning user and group (\`sudo chown secops:admin script.sh\`).
- **\`sudo\` & \`/etc/sudoers\`:** Grants explicitly scoped administrative execution to authorized accounts without sharing the root password. Always edit \`/etc/sudoers\` with **\`visudo\`** so syntax checks catch lockouts before saving.

#### How It Works
When an unprivileged user opens a file, the kernel checks effective UID first against Owner; if matched, Owner bits apply *even if Group/Others allow more*. Next it checks matching Group membership, and only otherwise falls back to Others. Combined with \`/etc/sudoers\` least-privilege rules, systems constrain both everyday tasks and administrative elevation cleanly.

#### Real-World Context
Hardening checklists like the CIS Linux Benchmark verify strict permissions on \`/etc/shadow\` (\`640\` or \`000\` root/shadow only), home SSH keys (\`~/.ssh/id_*\` \`600\`), and \`/etc/sudoers\` (\`440\`). Meanwhile, penetration testers immediately audit \`sudo -l\` and world-writable files specifically looking for shortcuts straight to \`root\`.

#### Examples
Locking down private SSH credentials and setting least-privilege service script ownership:
\`\`\`bash
# Restrict private SSH key strictly to Owner Read/Write (600)
chmod 600 ~/.ssh/id_ed25519

# Transfer ownership of a service script cleanly to user 'secops' and group 'admin'
sudo chown secops:admin launch_scanner.sh

# Verify updated permission bits and file type prefix
ls -lh launch_scanner.sh ~/.ssh/id_ed25519
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing \`600\` on private keys, avoiding \`777\` anywhere, and scoping \`/etc/sudoers\` rules tightly via \`visudo\` stops local lateral privilege escalation cold.
- **Attacker Misuse:** Attackers abuse overly broad \`777\` scripts executed by root cron jobs or wildcard \`sudo\` entries (documented in GTFOBins) to spawn elevated root shells.

#### Common Mistakes
- Setting **\`chmod 777\`** ("to make an error go away")—exposing scripts or secrets to every local user and compromised service account.
- Editing \`/etc/sudoers\` with plain \`nano\`/\`vi\` instead of **\`visudo\`**, risking syntax corruption that locks out all \`sudo\` access.
- Confusing **\`chmod\`** (permission mode bits) with **\`chown\`** (user and group ownership).

#### Key Takeaways
- In \`ls -la\`, leading **\`d\`** denotes a directory; bits encode **\`r=4\`, \`w=2\`, \`x=1\`** across Owner, Group, and Others.
- Octal **\`600\`** sets Owner Read/Write and zero access for Group/Others (mandatory for SSH private keys).
- **\`chown\`** changes file owner/group; **\`/etc/sudoers\`** governs permitted \`sudo\` elevation policies.

#### Knowledge Check
- Decode octal mode \`750\` back into its symbolic \`rwx\` string across Owner, Group, and Others.
- Why does the OpenSSH client reject a private key file carrying mode \`644\` instead of \`600\`?
- Which command modifies the owning user and group of a configuration file?

#### Further Learning
Practice permission calculations inside this lesson's **Practice Lab** and run \`man chmod\` and \`man sudoers\` to explore sticky bits and SUID/SGID flags.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Access Control & Permissions (chmod, chown, sudo)  

#### Learning Objectives
- Anchor executable scripts with the **\`#!/bin/bash\` shebang** line and strict variable assignment syntax (zero spaces around \`=\`).
- Iterate across hosts, files, and log lines using **\`for\`** loops and conditional tests (\`if/then\`).
- Check command success or failure programmatically via exit status variable **\`$?\`** (\`0\` = success).

#### Why It Matters
Manual administration doesn't scale across dozens of servers or thousands of incident log lines. Writing clean, defensive Bash scripts automates host inventory checks, incident triage collection, and repeatable compliance audits directly from native Linux terminals with zero extra dependencies.

#### Prerequisites & Connections
Building directly on **Access Control & Permissions (chmod, chown, sudo)** (so scripts receive proper \`+x\` execution rights safely), this lesson is recommended context for **Stream Editing & File Inspection** and **Python Basics & Data Structures**.

#### Core Explanation
Bash scripting relies on four essential language constructs:
- **Shebang (\`#!/bin/bash\`):** Placed as line 1 so the Linux kernel knows exact interpreter path executes the file cleanly when invoked directly (\`./script.sh\`).
- **Variable Assignment:** Must contain **NO whitespace** around \`=\` (e.g., \`target="192.0.2.10"\` works; \`target = "192.0.2.10"\` fails trying to execute a command named \`target\`). Always double-quote expansions (\`"$target"\`) to prevent word splitting or globbing bugs.
- **Iteration & Flow Control:** **\`for\`** loops traverse explicit lists, ranges, or file collections cleanly; \`if/then/fi\` branches on command exit codes.
- **Exit Status (\`$?\`):** Every command returns an integer status: **\`0\` means success**, while non-zero (\`1\`–\`255\`) indicates error conditions used automatically by \`&&\`, \`||\`, and \`set -e\`.

#### How It Works
Writing \`#!/bin/bash\` followed by \`set -euo pipefail\` stops silent failures inside automation pipelines. A \`for\` loop checks each host in an authorized documentation block \`198.51.100.0/24\`, tests ping reachability quietly, and checks \`$?\` (or \`&&\`) before logging healthy responders—transforming tedious repetition into one auditable script.

#### Real-World Context
SOC responders frequently keep lightweight Bash triage collectors ready to snapshot active sockets (\`ss -tulnp\`), logged-in sessions (\`who\`), running processes (\`ps aux\`), and SHA-256 hashes of \`/etc\` configs consistently across hosts during live incidents.

#### Examples
Safe lab sweep script iterating over a small authorized host subset:
\`\`\`bash
#!/bin/bash
subnet="198.51.100"
for host in 10 11 12; do
  if ping -c 1 -W 1 "$subnet.$host" > /dev/null 2>&1; then
    echo "Lab host $subnet.$host is reachable (exit=$?)"
  fi
done
\`\`\`

#### Security Relevance
- **Defensive Value:** Quoted variables, explicit \`#!/bin/bash\`, and \`set -euo pipefail\` prevent automation scripts from silently deleting unintended paths or failing halfway through backup/hardening jobs.
- **Attacker Misuse:** Unquoted variables or passing untrusted external input straight to \`eval\` or unquoted \`$(...)\` inside privileged scripts creates devastating **OS Command Injection** vulnerabilities.

#### Common Mistakes
- Adding spaces around \`=\` in variable assignments (\`target = "192.0.2.1"\` throws *command not found*).
- Leaving variable expansions unquoted (\`$filename\`), breaking whenever filenames contain spaces or shell wildcards.
- Assuming non-zero exit codes in \`$?\` mean success (\`0\` is always success in POSIX shells).

#### Key Takeaways
- **\`#!/bin/bash\`** tells the kernel which interpreter runs the script; variable assignment uses **no spaces** (\`target="192.0.2.1"\`).
- **\`for\`** loops iterate cleanly across lists and sequences; **\`$?\`** holds the **exit status code** of the last executed command (\`0\` = success).
- Always quote variables (\`"$var"\`) to harden scripts against whitespace bugs and injection.

#### Knowledge Check
- Why does \`ip = "192.0.2.5"\` raise an error in Bash while \`ip="192.0.2.5"\` works?
- What numeric value in \`$?\` confirms the previous command succeeded cleanly?
- Why should automation scripts quote \`"$file"\` inside loop bodies?

#### Further Learning
Continue to **Stream Editing & File Inspection (grep, find, awk, sed)** to pipe log files cleanly inside Bash automation scripts.`,
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
          content: `### Stream Editing & File Inspection (grep, find, awk, sed)

**Difficulty:** Intermediate  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Access Control & Permissions (chmod, chown, sudo)  

#### Learning Objectives
- Locate files across directory trees by name, type, permission, or size using **\`find\`** (e.g., \`find / -type f -size +100M\`).
- Search text patterns with context control in **\`grep\`** (such as \`-i\` and \`-A 5\` lines after match).
- Extract specific whitespace-delimited log columns via **\`awk\`** (\`{print $1, $4}\`) and transform text streams with **\`sed\`** (\`s/old/new/g\`).

#### Why It Matters
When an endpoint drops offline or SSH fails under brute-force load, opening gigabytes of raw \`/var/log\` text files in a GUI editor grinds to a halt. Mastering the Unix pipe (\`|\`) across \`find\`, \`grep\`, \`awk\`, and \`sed\` lets analysts carve attacker IP addresses and indicators out of massive logs in seconds.

#### Prerequisites & Connections
Building on **Access Control & Permissions (chmod, chown, sudo)** (with **Bash Shell & Core Scripting** recommended), this module powers log hunting in Tier 2 **SIEM & Ingestion Pipelines** and **Digital Forensics Analysis**.

#### Core Explanation
Four POSIX command-line workhorses filter files and text cleanly via standard output pipes:
- **\`find\`:** Walks filesystem hierarchies filtering by file type (\`-type f\`), names (\`-name "*.log"\`), sizes (\`-size +100M\`), or permission bits (\`-perm -4000\`).
- **\`grep\`:** Searches lines matching strings or regular expressions—supporting case-insensitivity (\`-i\`) and contextual surrounding lines (**\`-A N\`** prints *N* lines *After* each match; \`-B N\` prints *Before*; \`-C N\` both).
- **\`awk\`:** Column-oriented text processor splitting each line on whitespace by default into positional fields \`$1\`, \`$2\`, \`$3\`, \`$4\`... (\`awk '{print $1, $4}'\`).
- **\`sed\`:** Stream editor applying inline search-and-replace expressions across text streams via \`sed "s/HTTP/HTTPS/g" file.txt\`.

#### How It Works
Chaining these utilities creates zero-overhead ad-hoc SIEM queries: \`grep "Failed password" /var/log/auth.log\` isolates failed SSH attempts, \`awk '{print $11}'\` extracts only the offending source IP column, and piping into \`sort | uniq -c | sort -nr\` ranks the noisiest brute-force IP addresses instantly.

#### Real-World Context
Before uploading logs to an external support ticket, engineers regularly pass captures through \`sed 's/Bearer [A-Za-z0-9._-]*/Bearer REDACTED/g'\` to strip accidental credential tokens—combining rapid triage with disciplined privacy hygiene.

#### Examples
Finding logs and extracting attacking source IPs cleanly using a sample documentation IP:
\`\`\`bash
# Locate regular files larger than 100MB across root
find / -type f -size +100M 2>/dev/null

# Extract the 11th space-separated field (attacker IP) from a sample SSH log entry
echo "Jul 17 09:20:10 srv sshd[1204]: Failed password for root from 198.51.100.150 port 49152 ssh2" \\
  | grep "Failed password" | awk '{print $11}'

# Replace all occurrences of HTTP with HTTPS in config.txt
sed "s/HTTP/HTTPS/g" config.txt
\`\`\`

#### Security Relevance
- **Defensive Value:** Rapid \`find\` + \`grep\` + \`awk\` triage identifies webshells, unexpected large archives staged for exfiltration, and top brute-force IPs immediately during live incidents.
- **Attacker Misuse:** Intrusion actors use \`find\` just as fast—hunting readable SSH keys, \`*.kdbx\` password vaults, or SUID escalation paths across compromised hosts.

#### Common Mistakes
- Omitting the trailing \`g\` flag in \`sed "s/old/new/g"\`, which replaces only the *first* match on each line rather than all occurrences.
- Confusing \`grep -A 5\` (5 lines **After**) with \`-B 5\` (5 lines **Before**) or \`-C 5\` (Context both sides).
- Running \`sed -i\` in-place edits against active live audit logs instead of inspecting copies first.

#### Key Takeaways
- **\`awk '{print $1, $4}'\`** prints the first and fourth whitespace columns; **\`sed "s/HTTP/HTTPS/g"\`** replaces all occurrences globally per line.
- **\`find / -type f -size +100M\`** locates large regular files; **\`grep -A 5\`** prints 5 lines **After** each matched line.

#### Knowledge Check
- How do you instruct \`sed\` to replace *every* occurrence of a string on a line rather than stopping after the first match?
- Which \`grep\` flag displays five trailing lines immediately following a matched alert entry?
- In \`awk '{print $1, $4}'\`, what does \`$1\` represent?

#### Further Learning
Practice chaining \`grep\`, \`awk\`, and \`sed\` in this lesson's **Practice Lab** before scaling structured queries into **SIEM & Ingestion Pipelines**.`,
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
          content: `### Archiving & System Services (tar, gzip, cron, systemctl, journalctl)

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Access Control & Permissions (chmod, chown, sudo)  

#### Learning Objectives
- Package and compress log bundles or backups using **\`tar -czvf\`** (and verify/extract securely).
- Schedule recurring tasks with POSIX **\`cron\`** five-field timing syntax (\`minute hour day month weekday\`, e.g., \`0 * * * *\`).
- Manage **\`systemd\`** services (\`systemctl start/enable/status\`) and stream live unit logs via **\`journalctl -u <unit> -f\`**.

#### Why It Matters
Production Linux servers run background services continuously via \`systemd\` and automate backups or hygiene sweeps with \`cron\`. Both defenders archiving forensic evidence and threat actors planting stealth persistence rely heavily on service units and scheduled cron tasks—making unit & schedule auditing essential.

#### Prerequisites & Connections
Building directly on **Access Control & Permissions (chmod, chown, sudo)**, this module unlocks **Remote Operations (SSH, SCP, rsync)** (transferring compressed archives cleanly over SSH) and informs Linux persistence detection in Tier 3 **Privilege Escalation**.

#### Core Explanation
Core server operations span archiving, scheduling, and service control:
- **\`tar\` & \`gzip\`:** Bundles directory trees into compressed archives using **\`tar -czvf archive.tar.gz /path\`** (**c**reate, g**z**ip compress, **v**erbose, archive **f**ile) and extracts with \`tar -xzvf\`.
- **\`cron\` Scheduling:** Reads 5-field expressions (\`min hour day_of_month month day_of_week command\`)—so **\`0 * * * * /path/script.sh\`** executes cleanly at minute \`0\` **every hour of every day** (\`* * * * *\` runs every minute; \`0 0 * * *\` runs once daily at midnight).
- **\`systemd\` & \`systemctl\`:** PID 1 service manager controlling background daemons: \`systemctl start\` launches immediately now; **\`systemctl enable\`** creates boot target symlinks so a service starts **automatically on boot**.
- **\`journalctl\`:** Queries structured binary logs collected by \`systemd-journald\`—for instance **\`journalctl -u ssh -f\`** streams live logs strictly for the SSH daemon.

#### How It Works
When installing a hardened service or archiving incident evidence, engineers verify unit status via \`systemctl status\`, enable critical defense daemons (like firewall/auditd/EDR agents) with \`systemctl enable\`, watch live startup behavior via \`journalctl -u <service> -f\`, and bundle rotated \`/var/log\` artifacts with \`tar -czvf\` before shipping off-host.

#### Real-World Context
During Linux compromise triage, responders always audit \`systemctl list-unit-files --state=enabled\`, \`/etc/crontab\`, and \`/var/spool/cron/\`—because attackers frequently plant rogue systemd units or hourly cron scripts that re-download payloads even after suspicious processes are killed.

#### Examples
Packaging logs, checking systemd boot persistence, and streaming service journals:
\`\`\`bash
# Create a gzip-compressed tarball archive of /var/log
tar -czvf logs_backup.tar.gz /var/log

# Enable a service daemon to launch automatically at boot
sudo systemctl enable ssh

# Stream live systemd journal logs specifically for the SSH service unit
sudo journalctl -u ssh -f
\`\`\`

#### Security Relevance
- **Defensive Value:** Disabling unneeded \`systemd\` daemons shrinks host attack surface immediately, while archiving \`/var/log\` with SHA-256 checksums preserves triage evidence cleanly.
- **Attacker Misuse:** Threat actors abuse world-writable scripts called by \`cron\` or drop rogue \`.service\` files in \`/etc/systemd/system/\` for root boot persistence.

#### Common Mistakes
- Confusing \`systemctl start\` (runs *right now* until reboot) with **\`systemctl enable\`** (auto-starts on future system boots).
- Misreading \`0 * * * *\` (hourly on minute 0) as every minute (\`* * * * *\`) or daily (\`0 0 * * *\`).
- Passing \`-xzvf\` (extract) instead of **\`-czvf\`** (create) when trying to build a new \`.tar.gz\` archive.

#### Key Takeaways
- **\`systemctl enable\`** persists a service across reboots; **\`journalctl -u ssh -f\`** tails live SSH daemon journal entries.
- **\`0 * * * *\`** runs a cron job **every hour** on minute 0.
- **\`tar -czvf\`** creates a new gzip-compressed \`.tar.gz\` archive file.

#### Knowledge Check
- Which \`systemctl\` subcommand ensures a defensive daemon restarts automatically after an unexpected server reboot?
- What schedule does the cron expression \`0 * * * *\` represent versus \`0 0 * * *\`?
- Explain what each letter in \`tar -czvf\` instructs \`tar\` to do.

#### Further Learning
Proceed directly to **Remote Operations (SSH, SCP, rsync)** to move compressed backups securely between hosts.`,
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
          content: `### Remote Operations (SSH, SCP, rsync)

**Difficulty:** Intermediate  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Archiving & System Services (tar, gzip, cron, systemctl, journalctl)  

#### Learning Objectives
- Authenticate securely over **SSH (TCP Port 22)** using asymmetric public/private keys (\`~/.ssh/authorized_keys\`, \`~/.ssh/known_hosts\`).
- Transfer encrypted files with **\`scp\`** (noting uppercase **\`-P\`** for custom SSH ports).
- Synchronize large directories efficiently using **\`rsync\` delta-transfers** over encrypted SSH tunnels.

#### Why It Matters
Remote servers rarely have keyboards attached—every cloud VM and datacenter Linux box is administered over SSH. Misconfiguring SSH key permissions, ignoring unknown host-key warnings, or falling back to plaintext FTP exposes administrative credentials and whole infrastructure fleets directly.

#### Prerequisites & Connections
Building directly on **Archiving & System Services** (with **Network Topologies, OSI & TCP/IP Reference models** recommended alongside it), this module completes Linux Mastery and unlocks Tier 3 **Network Infiltration & Metasploit** (SSH tunneling & pivoting).

#### Core Explanation
Encrypted remote administration and file movement rely on three core utilities:
- **SSH Key Authentication & Trust:** Clients hold a secret private key (\`~/.ssh/id_ed25519\` or \`~/.ssh/id_rsa\`, chmod \`600\`) and place their public key inside the target server's **\`~/.ssh/authorized_keys\`** file. On initial connection, clients save the server's public host fingerprint inside local **\`~/.ssh/known_hosts\`** to detect later Man-in-the-Middle impersonation.
- **\`scp\` (Secure Copy Protocol):** Copies files securely over SSH—using uppercase **\`-P <port>\`** to connect on non-standard ports (lowercase \`-p\` instead preserves timestamps!).
- **\`rsync\`:** High-efficiency directory synchronization over SSH (\`-avz -e ssh\`) employing **delta-transfer** algorithms to send *only modified file blocks* rather than re-copying unchanged gigabytes.

#### How It Works
During public-key SSH login, the server challenges the client to sign a cryptographic nonce using its local private key—verifying identity via \`~/.ssh/authorized_keys\` without ever transmitting a password across the wire. Simultaneously, the client verifies the server's host signature against \`~/.ssh/known_hosts\`, raising a loud warning if a host key ever changes unexpectedly.

#### Real-World Context
Hardening internet-facing SSH bastions enforces key-based login only (\`PasswordAuthentication no\`, \`PermitRootLogin no\` inside \`/etc/ssh/sshd_config\`) paired with MFA/security-key tokens and strict source IP firewall allowlists—rendering credential-stuffing bots ineffective.

#### Examples
Transferring scripts and performing encrypted delta backups to lab host \`198.51.100.25\`:
\`\`\`bash
# Copy a script via scp targeting custom SSH port 2222 (-P uppercase)
scp -P 2222 -i ~/.ssh/id_ed25519 audit_script.sh analyst@198.51.100.25:/home/analyst/

# Synchronize web artifacts incrementally via delta-transfer over SSH
rsync -avz -e ssh /var/www/html/ analyst@198.51.100.25:/var/www/html/
\`\`\`

#### Security Relevance
- **Defensive Value:** Disabling SSH password logins in favor of key/FIDO2 auth, checking \`known_hosts\` warnings vigilantly, and automating backups with \`rsync -e ssh\` secures remote management and disaster recovery.
- **Attacker Misuse:** Attackers landing on developer workstations harvest unencrypted \`~/.ssh/id_rsa\` private keys (often unprotected by a passphrase) or inject their own public key into a server's \`~/.ssh/authorized_keys\` for quiet persistent access.

#### Common Mistakes
- Passing lowercase \`-p\` instead of uppercase **\`-P\`** to \`scp\` when specifying a custom SSH port.
- Blindly deleting \`~/.ssh/known_hosts\` warnings without verifying whether the server legitimately rotated keys or an active MitM proxy intercepted the connection.
- Copying an entire private key onto remote servers instead of copying only the **\`.pub\` public key** into \`authorized_keys\`.

#### Key Takeaways
- Place a client's *public key* into **\`~/.ssh/authorized_keys\`** on the remote server; local **\`~/.ssh/known_hosts\`** remembers remote server fingerprints against MitM hijacking.
- **\`rsync\`** uses **delta-transfers** over SSH to transmit only changed file blocks.
- Specify custom ports in \`scp\` with uppercase **\`-P <port>\`**.

#### Knowledge Check
- Why should an administrator never ignore a "REMOTE HOST IDENTIFICATION HAS CHANGED" warning linked to \`~/.ssh/known_hosts\`?
- Which exact file on a target Linux host authorizes passwordless SSH login for an approved public key?
- Why does \`rsync\` outperform \`scp\` when syncing a 50 GB folder where only 3 files changed?

#### Further Learning
Inspect \`/etc/ssh/sshd_config\` hardening options (like \`PasswordAuthentication no\`) and test SSH local port forwarding concepts later in **Post Exploitation Tactics**.`,
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
**Prerequisites:** System Boot & OS Architecture  

#### Learning Objectives
- Contrast **Windows User Mode (Ring 3)** isolation with privileged **Kernel Mode (Ring 0 / \`ntoskrnl.exe\`)** execution.
- Classify the five core **Windows Registry hives** (\`HKLM\`, \`HKCU\`, \`HKCR\`, \`HKU\`, \`HKCC\`) and their backing disk files (including per-user **\`NTUSER.DAT\`** and \`SAM\`/\`SYSTEM\`).
- Inspect common Registry startup keys (such as \`HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\`) cleanly for configuration and persistence auditing.

#### Why It Matters
Unlike Linux's scattered \`/etc\` text files, Windows centralizes OS drivers, installed software paths, user settings, and startup triggers inside the hierarchical **Windows Registry**. Navigating Registry hives and understanding User vs. Kernel privilege boundaries prepares you for every Windows defense, forensics, and administration skill ahead.

#### Prerequisites & Connections
Building directly on **System Boot & OS Architecture**, this module unlocks **Windows Command Shells (CMD & PowerShell)** and connects forward to Windows forensics in **Digital Forensics Analysis** (Registry artifacts like \`UserAssist\`).

#### Core Explanation
Windows NT system architecture divides execution rings and stores state hierarchically:
- **User Mode (Ring 3) vs. Kernel Mode (Ring 0):** Standard user applications, browsers, and subsystem DLLs run unprivileged in **User Mode**, invoking hardware only via documented Win32/NT system APIs. **Kernel Mode (\`ntoskrnl.exe\`, Ring 0)** holds unrestricted direct hardware and physical memory access for OS executives and signed kernel drivers.
- **The Windows Registry Hives:** Organized as nested folders ("keys") and key-value entries across five root hives:
  - **\`HKEY_LOCAL_MACHINE (HKLM)\`:** Machine-wide hardware, drivers, services, and OS software settings (backed by files in \`C:\\Windows\\System32\\config\\\` such as \`SYSTEM\`, \`SOFTWARE\`, and local account \`SAM\`).
  - **\`HKEY_CURRENT_USER (HKCU)\`:** Active user profile preferences, desktop configuration, and per-user startup settings—mapped dynamically from that user's **\`NTUSER.DAT\`** disk file.
  - **\`HKCR\`, \`HKU\`, \`HKCC\`:** File associations/COM classes, loaded user SID hives, and current hardware profiles.
- **Startup Registry Keys:** Paths such as **\`HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\`** (and \`HKCU\\...\`) auto-launch listed programs on user sign-in.

#### How It Works
When you sign in to Windows, the OS kernel loads machine configuration hives from \`System32\\config\` during Ring 0 boot, mounts your profile's \`NTUSER.DAT\` file as \`HKCU\`, checks \`Run\` keys to start background tray utilities, and isolates your desktop applications inside Ring 3 User Mode virtual address spaces.

#### Real-World Context
Auditing startup Registry \`Run\` keys via PowerShell or Sysinternals Autoruns is one of the fastest host checks an IT administrator or SOC responder runs when investigating suspicious slowdowns or unauthorized background executables surviving a workstation reboot.

#### Examples
Inspecting local machine startup \`Run\` entries non-destructively via PowerShell:
\`\`\`powershell
# List all configured machine-wide Run startup values cleanly
Get-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
\`\`\`

#### Security Relevance
- **Defensive Value:** Auditing \`HKLM\` and \`HKCU\` \`Run\` keys, restricting Registry ACL write permissions, and enforcing driver-signing policies in Ring 0 protect system integrity across boots.
- **Attacker Misuse:** Intrusion scripts commonly append unauthorized binary paths to \`Run\` keys for automatic startup persistence or inspect misconfigured user-writable Registry keys for privilege abuse.

#### Common Mistakes
- Confusing **\`HKLM\`** (global machine configuration across all users) with **\`HKCU\`** (individual logged-in user settings stored in \`NTUSER.DAT\`).
- Assuming User Mode (Ring 3) apps can read physical memory or hardware registers directly without going through Kernel Mode system calls.
- Deleting unknown Registry keys blindly without exporting a backup first (breaking OS services or applications).

#### Key Takeaways
- **Ring 0 (Kernel Mode)** grants direct CPU, memory, and hardware access; User Mode isolates standard apps at Ring 3.
- **\`HKEY_CURRENT_USER (HKCU)\`** holds per-user workspace settings loaded from **\`NTUSER.DAT\`**.
- **\`HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\`** is the classic machine-wide startup persistence key audited by defenders.

#### Knowledge Check
- Which physical file on disk stores a user's personal \`HKEY_CURRENT_USER\` settings across logins?
- How does Ring 0 Kernel Mode differ in hardware authority from Ring 3 User Mode?
- Why do both software installers and unauthorized persistence scripts target the \`CurrentVersion\\Run\` Registry key?

#### Further Learning
Continue directly to **Windows Command Shells (CMD & PowerShell)** and test Registry queries inside this lesson's **Practice Lab**.`,
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

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Windows Architecture & Registry  

#### Learning Objectives
- Contrast legacy **CMD** text-based utilities (\`ipconfig /all\`, **\`netstat -ano\`**) with **.NET object-based PowerShell** pipelines.
- Compose **\`Verb-Noun\` Cmdlets** and filter live properties cleanly (such as **\`Get-Service | Where-Object { $_.Status -eq "Stopped" }\`**).
- Explain what **PowerShell Execution Policies** (\`Restricted\`, \`RemoteSigned\`, \`-ExecutionPolicy Bypass\`) guard against—and why they are safety rails rather than security boundaries.

#### Why It Matters
While Unix/Linux pipes pass unstructured text streams requiring \`grep\` and \`awk\` gymnastics, PowerShell passes structured .NET objects across pipeline stages. Defenders use PowerShell daily to query thousands of Windows servers at once—yet attackers love it for the exact same power, making Script Block Logging and Constrained Language Mode essential.

#### Prerequisites & Connections
Building directly on **Windows Architecture & Registry**, this module equips you to automate event queries and domain checks in **Active Directory & Event Logs** and **OS Services & Security Controls**.

#### Core Explanation
Windows command administration bridges classic DOS/CMD diagnostics and modern object pipelines:
- **CMD Utilities:** Legacy interpreter running fast network/process diagnostics like \`ipconfig /all\` and **\`netstat -ano\`** (**a**ll sockets, **n**umeric ports, **o**wning **PID**).
- **PowerShell Object Pipelines:** Built atop the .NET runtime so commands (**\`Verb-Noun\` Cmdlets** like \`Get-Process\`, \`Get-Service\`) pass rich **structured objects** down the \`|\` pipe. Downstream filters inspect exact typed properties cleanly via \`Where-Object { $_.Status -eq "Stopped" }\` (\`$_\` represents the current pipeline object).
- **Execution Policies:** Safeguards (\`Restricted\`, \`RemoteSigned\`, \`AllSigned\`) preventing accidental double-click execution of untrusted \`.ps1\` scripts—NOT an enforced security perimeter, since an interactive user or attacker can pass **\`-ExecutionPolicy Bypass\`** directly on the command line.

#### How It Works
When you run \`Get-Service | Where-Object { $_.Status -eq "Stopped" }\`, \`Get-Service\` emits full \`ServiceController\` objects with typed \`Name\`, \`Status\`, and \`StartType\` properties directly into \`Where-Object\`, eliminating fragile column counting completely. Meanwhile, pairing \`netstat -ano\` with \`Get-Process -Id <PID>\` ties any suspicious TCP listener immediately back to its executable.

#### Real-World Context
Because administrators and threat actors alike execute one-line PowerShell commands in memory without touching \`.ps1\` files, enterprises turn on **PowerShell Script Block Logging (Event ID 4104)** and **AMSI (Antimalware Scan Interface)**—ensuring every decoded command executed inside PowerShell gets scanned and shipped to SIEM storage automatically.

#### Examples
Running network socket triage in CMD and object-based service filtering in PowerShell:
\`\`\`cmd
:: Display numeric listening/active TCP & UDP ports alongside owning Process ID (PID)
netstat -ano
\`\`\`
\`\`\`powershell
# Filter stopped Windows services cleanly via structured .NET object properties
Get-Service | Where-Object { $_.Status -eq "Stopped" }
\`\`\`

#### Security Relevance
- **Defensive Value:** Enabling PowerShell v5+ **Script Block Logging (4104)**, module logging, AMSI integration, and Constrained Language Mode turns PowerShell into an auditable defensive superpower.
- **Attacker Misuse:** Living-off-the-Land scripts routinely pass \`-ExecutionPolicy Bypass\` and encoded Base64 payloads (\`-enc\`) to download or run memory-only stages without triggering legacy \`.ps1\` file blocks.

#### Common Mistakes
- Treating PowerShell **Execution Policy** as a hacker-proof security wall rather than a safety guardrail (since \`-ExecutionPolicy Bypass\` works freely by design).
- Trying to parse PowerShell console tables with string slicing instead of accessing \`.NET\` object properties (\`$_.Property\`) directly.
- Forgetting \`-o\` in \`netstat -ano\`, omitting the Process ID needed to identify *which* executable opened a port.

#### Key Takeaways
- **PowerShell pipelines pass structured .NET objects**, letting downstream cmdlets filter typed properties directly without text parsing.
- **\`Get-Service | Where-Object { $_.Status -eq "Stopped" }\`** filters stopped services; **\`netstat -ano\`** links ports to owning PIDs.
- **\`-ExecutionPolicy Bypass\`** overrides default script restrictions—rely on Script Block Logging, AppLocker/WDAC, and AMSI for true enforcement.

#### Knowledge Check
- Why doesn't PowerShell need \`awk\` or column splitting inside \`Get-Process | Where-Object\` pipelines?
- What information does adding \`-o\` in \`netstat -ano\` reveal that \`netstat -an\` hides?
- Why isn't \`Set-ExecutionPolicy Restricted\` sufficient on its own to stop malicious PowerShell usage?

#### Further Learning
Proceed to **Active Directory & Event Logs** to use PowerShell \`Get-WinEvent\` for filtering Windows authentication logs.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Windows Command Shells (CMD & PowerShell)  

#### Learning Objectives
- Explain the core structure of **Active Directory (AD)**—Forests, Domains, Organizational Units (OUs), and **Domain Controllers (DCs)**.
- Trace ticket-based single sign-on via **Kerberos** (contrasting encrypted tickets against legacy NTLM hashes).
- Query authentication audits in **Windows Event Viewer Security Logs**—specifically **Event ID 4624** (Successful Logon) and **4625** (Failed Logon).

#### Why It Matters
Almost every large corporate network relies on Active Directory to authenticate employees, apply Group Policy settings, and authorize file shares. Knowing how Domain Controllers issue Kerberos tickets—and where Windows records successful and failed logins—forms the foundation of both enterprise blue-team monitoring and AD penetration testing.

#### Prerequisites & Connections
Building directly on **Windows Command Shells (CMD & PowerShell)**, this module unlocks **OS Services & Security Controls**, Tier 2 **Endpoint Auditing & Sysmon**, and Tier 3 **Password Auditing & Cracking** and **Active Directory Exploitation**.

#### Core Explanation
Enterprise Windows identity management rests on two pillars:
- **Active Directory & Domain Controllers:** **AD** organizes user accounts, computers, and security groups inside **Organizational Units (OUs)** across a Domain. The **Domain Controller (DC)** hosts the central directory database, verifies logons, and enforces domain-wide Group Policy Objects (GPOs).
- **Kerberos Authentication:** Standard enterprise ticket protocol: rather than re-sending your password to every file server, the DC's Key Distribution Center (KDC) verifies your identity once, issues a Ticket Granting Ticket (TGT), and exchanges it for scoped Service Tickets (TGS) using symmetric keys.
- **Event Viewer Logs:** Windows records logs across Application, System, Setup, and **Security** channels. The **Security Log** captures account creations (4720), **Successful Logons (Event ID 4624)**, and **Failed Logons (Event ID 4625)**—indispensable for spotting credential stuffing and lateral movement.

#### How It Works
When an employee unlocks their domain laptop and opens a Finance file share, the workstation authenticates to the Domain Controller over Kerberos (TCP/UDP 88), obtains a Service Ticket for the file server, and opens the share cleanly. Both the DC and target server write **Event ID 4624** records into their **Security Log** specifying username, logon type, and source workstation IP.

#### Real-World Context
Every SOC correlates **Event ID 4625** bursts (password guessing or spraying) followed by an unexpected **Event ID 4624** from an unusual source IP outside normal business hours—turning raw Windows Security Logs into immediate intrusion detection signals.

#### Examples
Querying recent successful logons cleanly out of the Security Log via PowerShell:
\`\`\`powershell
# Retrieve the 5 most recent Successful Logon records (Event ID 4624)
Get-WinEvent -FilterHashtable @{ LogName = 'Security'; ID = 4624 } -MaxEvents 5
\`\`\`

#### Security Relevance
- **Defensive Value:** Turning on Advanced Audit Policies, protecting Domain Controllers on isolated Tier-0 infrastructure, enforcing Kerberos over legacy NTLM v1, and shipping Security Logs off-host preserves trustworthy identity audit trails.
- **Attacker Misuse:** Threat actors target misconfigured AD group nesting, weak service-account passwords (Kerberoasting), and cleared Security Logs (Event ID 1102) to move undetected across corporate domains.

#### Common Mistakes
- Leaving Advanced Security Audit logging off, causing Logon and Process Creation events to go unrecorded.
- Confusing **Event ID 4624** (Successful Logon) with **4625** (Failed Logon) or looking inside the System/Application logs instead of the **Security Log**.
- Assuming Kerberos still sends cleartext passwords to every accessed file or web server.

#### Key Takeaways
- **Domain Controllers (DCs)** manage centralized Active Directory objects and domain authentication via **Kerberos** cryptographic tickets.
- Authentication audits live in the Windows **Security Log**; **Event ID 4624** logs successful logons (while **4625** logs failed attempts).

#### Knowledge Check
- How does Kerberos let a domain user access five different internal servers without transmitting their password to any of those five servers?
- Which exact Windows Event Viewer log category and Event ID confirm a successful account logon?
- Why is centralized forwarding of Domain Controller Security Logs critical during an intrusion?

#### Further Learning
Continue to **OS Services & Security Controls** and then deepen endpoint log hunting in **Endpoint Auditing & Sysmon** and **Active Directory Exploitation**.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Active Directory & Event Logs  

#### Learning Objectives
- Audit **Windows Services** and minimize host attack surface by disabling unnecessary auto-starting listeners.
- Automate recurring maintenance or identify persistence via **Task Scheduler**.
- Configure host-level **Windows Defender Firewall** rules via **\`New-NetFirewallRule\`** and contrast signature vs. heuristic protection in **Microsoft Defender**.

#### Why It Matters
Every unnecessary background service widens a server's attack surface, and relying solely on perimeter firewalls leaves internal workstations helpless against lateral SMB or WinRM spread. Hardening host services, scheduled tasks, and built-in host firewalls blocks lateral movement directly on the endpoint.

#### Prerequisites & Connections
Building on **Active Directory & Event Logs**, this module closes the Windows Administration track and prepares directly for Tier 2 **Endpoint Security (AV, EDR, XDR)** and Tier 3 **Privilege Escalation**.

#### Core Explanation
Windows endpoint defense layers four native controls:
- **Windows Services:** Long-running background processes executing without an interactive user login. Disabling unused services shrinks listening ports, memory exposure, and vulnerable binary targets (**reducing attack surface**).
- **Task Scheduler:** Automates scripts or backups based on time, logon, or event triggers—widely used legitimately by IT admins and frequently abused for malware persistence.
- **Windows Defender Firewall:** Stateful host-based firewall filtering inbound and outbound sockets, managed cleanly in PowerShell via **\`New-NetFirewallRule\`**.
- **Microsoft Defender Antivirus:** Built-in endpoint protection combining fast **signature-based detection** (matching known malware file hashes and byte signatures) with behavioral heuristics and cloud-delivered analysis.

#### How It Works
During baseline server hardening, administrators query \`Get-Service\` for automatic services, stop and disable unnecessary components (like print spoolers on domain controllers), enable host firewall profiles across Domain/Private/Public adapters to block workstation-to-workstation SMB (\`445/TCP\`), and keep Defender real-time tamper protection active.

#### Real-World Context
Many ransomware outbreaks spread rapidly across office LANs solely because Windows Defender Firewall was disabled across the Domain profile by legacy IT policies—allowing one infected laptop to push SMB payloads straight to neighboring computers on the same floor. Enforcing host firewall lateral blocks contains breaches to a single machine.

#### Examples
Auditing auto-start services and blocking unauthorized inbound SMB via PowerShell:
\`\`\`powershell
# List all Windows services configured to start automatically at boot
Get-Service | Where-Object { $_.StartType -eq 'Automatic' }

# Create a host firewall rule blocking unsolicited inbound SMB (TCP 445)
New-NetFirewallRule -DisplayName "Block Inbound SMB" -Direction Inbound -LocalPort 445 -Protocol TCP -Action Block
\`\`\`

#### Security Relevance
- **Defensive Value:** Disabling extraneous services, auditing Task Scheduler entries, enforcing host firewalls between workstations, and enabling Defender Tamper Protection establish strong baseline endpoint hygiene.
- **Attacker Misuse:** Intrusion actors create covert Scheduled Tasks for persistence, target poorly ACL'd or unquoted Windows Services to escalate to \`SYSTEM\`, and disable host firewall/Defender profiles when local admin privileges lack Tamper Protection.

#### Common Mistakes
- Turning off **Windows Defender Firewall** internally thinking the corporate perimeter firewall protects peer-to-peer LAN traffic.
- Ignoring **Task Scheduler** when hunting persistence because focus went solely to Registry \`Run\` keys.
- Assuming signature-based antivirus detection alone stops brand-new custom or fileless scripts without behavioral heuristics/EDR.

#### Key Takeaways
- Leaving unneeded Windows services running widens the host **attack surface** with unnecessary listening ports and entry points.
- **Task Scheduler** automates recurring triggers; **\`New-NetFirewallRule\`** enforces PowerShell host firewall policies.
- **Signature-based detection** matches known file hashes and byte patterns against threat databases.

#### Knowledge Check
- How does disabling unused Windows services directly harden a server even before installing extra security tools?
- Why should workstation Windows Defender Firewalls block unsolicited inbound SMB (port 445) from peer laptops inside the office?
- What is the limitation of purely signature-based antivirus detection?

#### Further Learning
Continue to **Hypervisors (VirtualBox, VMware, Hyper-V)** and explore host behavioral monitoring in **Endpoint Security (AV, EDR, XDR)**.`,
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
**Prerequisites:** Virtualization & Cloud Basics  

#### Learning Objectives
- Compare **Type 1 bare-metal hypervisors** (ESXi, Proxmox VE, KVM) against **Type 2 hosted hypervisors** (Oracle VirtualBox, VMware Workstation).
- Select appropriate virtual network modes (**NAT**, **Bridged**, **Host-Only**) based on isolation requirements.
- Harden sandboxed lab VMs safely (snapshots, Host-Only containment) prior to running untrusted tests or malware.

#### Why It Matters
Every cybersecurity learner and malware analyst depends on local virtual labs—to practice offensive tools legally without breaking real systems, or detonate unknown binaries safely. Picking the wrong virtual NIC mode (such as Bridged instead of Host-Only) can expose your real home or corporate LAN directly to lab experiments.

#### Prerequisites & Connections
Building directly on **Virtualization & Cloud Basics**, this module unlocks **Containerization (Docker, Docker Images, Docker Containers, Docker Compose)** and provides critical lab-isolation mechanics for Tier 5 **Dynamic Malware Analysis**.

#### Core Explanation
Hypervisors isolate guest operating systems while exposing configurable virtual network switches:
- **Type 1 vs. Type 2 Hypervisors:** Enterprise datacenters run **Type 1 bare-metal hypervisors** directly over physical hardware (eliminating host-OS overhead for maximum performance and tighter separation), while desktop labs run **Type 2 hosted hypervisors** like **Oracle VirtualBox** as applications atop Windows/macOS/Linux.
- **Virtual Networking Modes:**
  - **NAT Mode:** Guests share the host computer's external IP transparently for outbound internet updates while hiding behind the host from unsolicited inbound LAN probes.
  - **Bridged Mode:** Binds the guest's virtual NIC straight onto the physical LAN switch so the VM receives its own independent local IP—visible to every neighboring device.
  - **Host-Only Mode:** Creates a private, air-gapped virtual ring connecting *only* host and isolated VMs—essential for safe **malware analysis** so samples cannot reach your physical LAN or the internet.

#### How It Works
Before testing an unfamiliar binary or network attack lab, operators configure the guest adapter to **Host-Only** (or an isolated Internal Virtual Network), disable shared host folders/clipboard, and capture a clean hypervisor **snapshot**. Once finished, reverting to the snapshot discards every disk and RAM change instantly.

#### Real-World Context
Accidentally switching a malware analysis VM from Host-Only to Bridged networking has historically allowed wormable ransomware samples to scan office printer subnets and corporate file shares directly off an analyst's laptop—proving why network adapter isolation must always be verified before executing untrusted samples.

#### Examples
Comparing virtual network modes by exposure and ideal security use case:
\`\`\`text
Virtual NIC Mode   External Internet?   Reachable on Physical LAN?   Best Security Use Case
-----------------  -------------------  ---------------------------  ----------------------------------------
NAT                Outbound via Host    No (shielded behind host)    Downloading OS updates in learning VMs
Bridged            Direct LAN/WAN       Yes (gets own LAN IP)        Hosting lab targets on isolated test LAN
Host-Only          None (air-gapped)    No (Host <-> Guest only)     Dynamic malware analysis & attack/defend
\`\`\`

#### Security Relevance
- **Defensive Value:** Host-Only isolation, disabled shared folders, and snapshot rollbacks allow fearless experimentation and forensic analysis with near-zero real-world collateral risk.
- **Attacker Misuse:** Advanced malware runs VM-detection checks (inspecting VirtualBox/VMware MAC OUIs or guest additions) to stay dormant in sandboxes or attempts rare hypervisor-escape vulnerabilities against unpatched hosts.

#### Common Mistakes
- Using **Bridged Mode** during dynamic malware analysis instead of **Host-Only**.
- Assuming VM snapshots replace verified backups when real workstation disasters corrupt the physical host drive.
- Leaving shared folders mounted read-write into untrusted analysis guests.

#### Key Takeaways
- **Type 1** bare-metal hypervisors eliminate host-OS overhead; **Oracle VirtualBox** is a classic **Type 2** hosted desktop hypervisor.
- **Bridged Mode** places the VM directly onto the physical LAN; **Host-Only Mode** isolates the guest from external networks and neighboring LAN hosts for safe malware labs.

#### Knowledge Check
- Which virtual network mode assigns a VM its own standalone IP address directly on your office or home LAN?
- Why is **Host-Only** networking critical when running dynamic malware analysis?
- What architectural overhead do **Type 1** hypervisors avoid compared to **Type 2** hypervisors?

#### Further Learning
Continue to **Containerization (Docker, Docker Images, Docker Containers, Docker Compose)** to contrast full-VM virtualization with OS-level Linux container isolation.`,
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
          content: `### Containerization (Docker, Docker Images, Docker Containers, Docker Compose)

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Hypervisors (VirtualBox, VMware, Hyper-V), Linux Installation & File System  

#### Learning Objectives
- Contrast OS-level **Docker Containers** (sharing the host Linux kernel via **namespaces** & **cgroups**) against heavyweight virtual machines.
- Read and build read-only **Docker Images** from a **\`Dockerfile\`** and run multi-service stacks with **Docker Compose**.
- Execute interactive diagnostics via **\`docker exec -it\`** while applying container security hygiene (non-root users, never mounting \`docker.sock\`, minimal base images).

#### Why It Matters
Containers power almost all modern cloud APIs, CI/CD runners, and local security labs. Because containers *share one host OS kernel* rather than running isolated guest kernels, understanding namespaces, non-root image builds, and socket dangers separates clean isolation from trivial container-to-host breakouts.

#### Prerequisites & Connections
Building on **Hypervisors (VirtualBox, VMware, Hyper-V)** and **Linux Installation & File System**, this module unlocks **Orchestration Basics (Kubernetes Basics)** and Tier 4 **DevSecOps, Secure SDLC & CI/CD Pipelines**.

#### Core Explanation
Docker standardizes application packaging and OS-level process isolation:
- **VMs vs. Containers:** Virtual machines boot complete independent guest OS kernels; **Docker Containers share the host OS kernel** while isolating filesystems, PIDs, users, and network interfaces through Linux **namespaces** and capping CPU/RAM via **cgroups**.
- **Images, Containers & \`Dockerfile\`:** A **\`Dockerfile\`** defines sequential build commands (\`FROM\`, \`RUN\`, \`COPY\`, \`USER\`, \`ENTRYPOINT\`) compiled into an immutable, read-only **Docker Image**; running that image launches a live **Docker Container**.
- **Docker Compose:** Defines multi-container application stacks (for instance web frontend + API + database + private network) cleanly inside a single YAML manifest (\`docker-compose.yml\`).
- **Interactive Troubleshooting:** Use **\`docker exec -it <container> <shell>\`** to open an interactive shell inside an *already running* container instance.

#### How It Works
When you run \`docker build\` on a hardened \`Dockerfile\`, Docker layers immutable filesystem snapshots using minimal base distributions (like Alpine or Distroless) and drops root privileges via a dedicated \`USER appuser\` instruction. At runtime, Linux kernel namespaces ensure processes inside the container only see their own isolated PID tree and loopback/bridge network stack.

#### Real-World Context
A frequent production mistake is mounting the host's control socket (\`-v /var/run/docker.sock:/var/run/docker.sock\`) or passing \`--privileged\` into a utility container for convenience. Anyone compromising that container immediately gains root control over the entire physical Docker host via socket API calls.

#### Examples
Building a minimal hardened container image and inspecting a running container safely:
\`\`\`bash
# Build a minimal Alpine-based utility image from a local Dockerfile
cat << 'EOF' > Dockerfile
FROM alpine:3.20
RUN apk add --no-cache curl && adduser -D appuser
USER appuser
ENTRYPOINT ["curl", "--version"]
EOF

docker build -t safe-curl:1.0 .
docker run --rm safe-curl:1.0
\`\`\`

#### Security Relevance
- **Defensive Value:** Running containers as non-root \`USER\`, mounting read-only root filesystems (\`--read-only\`), scanning images in CI/CD, and pinning base digests limits post-exploitation impact drastically.
- **Attacker Misuse:** Adversaries exploit containers running as UID \`0\` with \`--privileged\` flags, leaked secrets baked inside \`ENV\`/\`COPY\` layers, or exposed Docker sockets/remote APIs to break straight out onto the host.

#### Common Mistakes
- Baking passwords, SSH keys, or \`.env\` secrets into \`Dockerfile\` layers (removing a file in a later \`RUN\` layer leaves it intact inside earlier image layers!).
- Using \`docker run -d\` thinking it attaches an interactive terminal into an *existing* container instead of **\`docker exec -it\`**.
- Running production containers as default \`root\` with \`--privileged\` flags.

#### Key Takeaways
- **Containers share the host OS kernel** (isolated via Linux namespaces & cgroups); **virtual machines boot separate guest OSes**.
- A **\`Dockerfile\`** compiles read-only Docker images; **Docker Compose** orchestrates multi-container stacks via YAML.
- Use **\`docker exec -it\`** to attach interactively to a running container, and always configure non-root \`USER\` accounts.

#### Knowledge Check
- Why do Docker containers start in milliseconds compared to booting a Type 2 VirtualBox VM?
- Which file defines the step-by-step build instructions for creating a Docker image?
- Why is deleting an API key in line 5 of a \`Dockerfile\` after copying it in line 3 still unsafe?

#### Further Learning
Proceed directly to **Orchestration Basics (Kubernetes Basics)** to scale multi-node container fleets and later harden pipelines in **DevSecOps, Secure SDLC & CI/CD Pipelines**.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Containerization (Docker, Docker Images, Docker Containers, Docker Compose)  

#### Learning Objectives
- Map core Kubernetes Control Plane architecture (**\`kube-apiserver\`**, **\`etcd\`**, \`kube-scheduler\`) vs. worker node agents (**\`kubelet\`**).
- Explain **Pods** (smallest deployable unit), **Nodes**, and **Services** (stable internal DNS/IP routing across ephemeral Pods).
- Inspect active Pods and cluster health safely using modern **\`kubectl\`** commands (\`kubectl get pods\`, \`kubectl version\`).

#### Why It Matters
Running two containers on one server works with Docker Compose, but production services across dozens of servers need automated self-healing, rolling updates, and secret/network boundaries. Learning Kubernetes building blocks now equips you for cluster hardening in Tier 4 without confusion over Control Plane vs. Node responsibilities.

#### Prerequisites & Connections
Building directly on **Containerization (Docker, Docker Images, Docker Containers, Docker Compose)**, this lesson unlocks Tier 4 **Kubernetes Cluster Hardening** and pairs cleanly with **DevSecOps, Secure SDLC & CI/CD Pipelines**.

#### Core Explanation
Kubernetes orchestrates desired cluster states declaratively across Control Plane and Worker Nodes:
- **Pod:** The **smallest deployable computing unit** in Kubernetes—hosting one or more tightly coupled containers sharing a network IP namespace and mounted storage volumes.
- **Control Plane & \`etcd\`:** The **\`kube-apiserver\`** validates all API requests; **\`etcd\`** serves as the distributed key-value datastore holding the authoritative cluster configuration and state (including Secrets!); \`kube-scheduler\` places new Pods onto healthy Nodes.
- **Worker Nodes & \`kubelet\`:** Physical or virtual machines running scheduled Pods. The **\`kubelet\`** daemon on each node watches assigned Pod specs continuously to keep containers started and healthy.
- **Service:** Because Pods are ephemeral and change IPs on every restart, a **Service** provides a stable virtual IP, DNS entry, and load balancing across matching Pod labels.

#### How It Works
When you apply a Deployment YAML via \`kubectl\`, the API server authenticates your request, persists the desired state in \`etcd\`, \`kube-scheduler\` selects available worker Nodes, and each node's \`kubelet\` directs the container runtime to start the Pods—reporting status continuously back to the Control Plane.

#### Real-World Context
Historically, multiple major cloud breaches occurred when administrators exposed either an unauthenticated **\`etcd\`** datastore port (\`2379/TCP\`) or a permissive **\`kube-apiserver\`** (\`6443/TCP\`) directly to the public internet—allowing attackers to dump plain Base64-encoded Secrets or schedule privileged crypto-mining Pods across every node.

#### Examples
Inspecting Pod state and modern Kubernetes CLI/cluster versions cleanly:
\`\`\`bash
# List running Pods inside the current active namespace
kubectl get pods

# Verify modern kubectl client and cluster API server versions
kubectl version
\`\`\`

#### Security Relevance
- **Defensive Value:** Encrypting **\`etcd\`** at rest, restricting \`kube-apiserver\` behind strict RBAC + VPN/private endpoints, and routing traffic strictly through defined Services isolates control-plane integrity from workload failures.
- **Attacker Misuse:** Attackers landing inside a single misconfigured Pod check for mounted default ServiceAccount tokens, try querying internal \`etcd\` or \`kubelet\` read-only ports, and abuse flat cluster networks if NetworkPolicies are missing.

#### Common Mistakes
- Treating **\`etcd\`** as harmless log storage when it actually holds cluster state and Kubernetes Secrets.
- Exposing worker-node **\`kubelet\`** APIs without authentication or granting default Pods overly broad \`ServiceAccount\` RBAC roles.
- Referring to individual containers directly instead of **Pods** as Kubernetes' smallest deployable unit.

#### Key Takeaways
- A **Pod** is the smallest deployable computing unit in Kubernetes; a **Service** provides a stable IP/DNS route across dynamic Pods.
- **\`etcd\`** acts as the Control Plane's distributed key-value source of truth for cluster configuration and state.
- The **\`kubelet\`** runs on every worker node to monitor Pod specs and keep assigned containers healthy.

#### Knowledge Check
- Why does Kubernetes route client traffic through a **Service** instead of hardcoding a Pod's internal IP address?
- Which Control Plane component acts as the authoritative cluster state database that must always be encrypted and firewalled?
- What responsibility does the **\`kubelet\`** agent perform on worker nodes?

#### Further Learning
Continue to Tier 4 **Kubernetes Cluster Hardening** to configure least-privilege RBAC Roles and Pod NetworkPolicies.`,
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
**Prerequisites:** Computer Hardware, CPU, RAM & Storage  

#### Learning Objectives
- Clone, stage, commit, branch (\`git checkout -b\`), and push code changes cleanly in distributed **Git** repositories.
- Explain how the **Git staging area** (\`git add\`) structures selective, auditable commit snapshots.
- Protect repositories from leaked credentials and unreviewed merges using branch protections and secret-scanning habits.

#### Why It Matters
Every modern infrastructure-as-code manifest, CI/CD workflow, SIEM detection rule, and application patch lives inside Git repositories. Understanding how Git commits retain permanent snapshots explains *why* accidentally pushing an API key—even if deleted in a second commit—still leaves the secret exposed in history until rotated and scrubbed.

#### Prerequisites & Connections
Building on **Computer Hardware, CPU, RAM & Storage** (files and persistent revisions), this lesson unlocks **Structured Formats (Markdown, JSON, YAML)**, Tier 4 **DevSecOps, Secure SDLC & CI/CD Pipelines**, and Tier 11 **Portfolio Building & Resumes**.

#### Core Explanation
Distributed version control organizes change history across four daily primitives:
- **\`git clone\` & Repository:** Copies a full remote repository—complete with its entire past commit history—down to your workstation.
- **Staging Area (\`git add\`):** Intermediate buffer allowing engineers to review and selectively group file edits before recording a permanent snapshot via \`git commit\`.
- **Branches (\`git checkout -b <name>\`):** Creates and switches immediately into an isolated development branch so experimental edits stay separated from production \`main\` until reviewed via Pull Request.
- **Remote Sync (\`git push\`):** Uploads local committed snapshots to a remote host (such as GitHub or GitLab).

#### How It Works
Suppose an engineer creates a branch with \`git checkout -b harden-headers\`, modifies configuration files, reviews diffs carefully with \`git diff\`, stages verified edits via \`git add\`, commits with a descriptive message, and runs \`git push\` to open a peer-reviewed Pull Request—triggering automated CI checks before merging.

#### Real-World Context
One of the most frequent real-world security incidents happens when a developer commits a \`.env\` or cloud API key into Git, spots the mistake, deletes the file in the next commit, and pushes. Because Git records every historical commit object forever, automated bots watching public repositories harvest leaked tokens within seconds—requiring immediate **secret revocation/rotation** plus history scrubbing.

#### Examples
Clean feature-branch workflow and pre-commit secret verification:
\`\`\`bash
# Download an existing repository cleanly to your workstation
git clone https://github.com/example-org/security-scripts.git

# Create and switch immediately to a new feature branch
git checkout -b add-log-parser

# Stage reviewed edits and verify no .env or private keys are staged before committing
git add parser.py
git diff --cached
git commit -m "Add sanitized auth log parser"
git push -u origin add-log-parser
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing branch protection on \`main\`, requiring Pull Request reviews, signing commits, enabling \`.gitignore\` for local \`.env\` files, and running automated secret scanners (\`gitleaks\`) keeps supply chains clean.
- **Attacker Misuse:** Attackers scan public GitHub commits and \`git log -p\` history for forgotten AWS keys, database passwords, and internal API endpoints left behind even in deleted commits.

#### Common Mistakes
- Deleting a committed secret in a *second* commit and assuming it vanished from Git history (the earlier commit snapshot still holds it!).
- Running \`git add .\` blindly without inspecting \`git status\` / \`git diff --cached\`, accidentally staging \`.env\` or private keys.
- Pushing directly to \`main\` without Pull Request review or CI verification.

#### Key Takeaways
- **\`git clone\`** copies a remote repository and history locally; the **staging area** buffers selective edits before committing; **\`git push\`** uploads commits remotely.
- **\`git checkout -b <branch>\`** creates a new branch and switches your active workspace onto it immediately.
- Deleting a leaked key in a later commit does **not** erase it from \`git log -p\`—always **rotate compromised secrets immediately**.

#### Knowledge Check
- Why does running \`git rm .env && git commit\` fail to protect an API key pushed in an earlier commit?
- What is the operational role of the Git **staging area** between editing a file and running \`git commit\`?
- Which command creates a new branch and switches onto it in one step?

#### Further Learning
Proceed directly to **Structured Formats (Markdown, JSON, YAML)** and test a leaked-secret Git history triage in this lesson's **Practice Lab**.`,
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
**Prerequisites:** Git & GitHub Workflows  

#### Learning Objectives
- Format readable technical reports and runbooks using **Markdown** headings (\`###\`), lists, and fenced code blocks.
- Construct and validate **JSON** payloads (\`{ "key": "value" }\` double-quoted keys and strings).
- Write indentation-driven **YAML** cloud/CI manifests and avoid **insecure deserialization** bugs when parsing untrusted YAML/JSON inputs.

#### Why It Matters
Almost every API request, Kubernetes manifest, IAM policy, Sigma detection rule, and vulnerability report uses JSON, YAML, or Markdown. Misplaced YAML indentation or trusting unsafe YAML loaders can disable entire security controls or open arbitrary remote code execution flaws inside parsers.

#### Prerequisites & Connections
Building directly on **Git & GitHub Workflows**, this module unlocks **Databases, SQL & Data Access** (document data models & structured queries) and **Python Basics & Data Structures** (native JSON/dictionary parsing).

#### Core Explanation
Three human- and machine-readable text formats power modern security engineering:
- **Markdown:** Lightweight documentation syntax using hashes for heading levels (**\`### Heading\`** creates a level-3 heading), asterisks/hyphens for lists, and triple backticks for code blocks.
- **JSON (JavaScript Object Notation):** Strict key-value data interchange format requiring **double quotes** around every key and string value inside curly braces (\`{ "name": "Alice", "role": "admin" }\`). Ubiquitous in REST APIs, CloudTrail logs, and AWS IAM policies.
- **YAML (YAML Ain't Markup Language):** Uses clean **whitespace indentation** instead of curly braces, making it ideal for Kubernetes manifests, Docker Compose, GitHub Actions, and Ansible playbooks.
- **Deserialization Security:** Parsing untrusted YAML/JSON through unsafe object constructors (\`yaml.load()\` without \`SafeLoader\` in Python) risks **Insecure Deserialization**—executing attacker payloads embedded inside configuration text.

#### How It Works
When an application loads a YAML policy file or JSON webhook payload, strict schema validators check expected field types while safe parsers (\`JSON.parse\`, Python \`yaml.safe_load\`) construct purely inert strings, numbers, lists, and maps—never instantiating arbitrary runtime classes or disabling boolean security flags via whitespace drift.

#### Real-World Context
A single stray space in a Kubernetes or firewall YAML manifest can silently shift a nested key into the wrong block, or an unvalidated boolean (\`verify_certificates: false\`, \`allowed_origins: ["*"]\`) in a gateway policy can silently disable TLS verification and open CORS globally across production APIs.

#### Examples
Comparing clean valid JSON, YAML, and Markdown representations:
\`\`\`json
{
  "name": "Alice",
  "role": "admin",
  "mfa_enforced": true
}
\`\`\`
\`\`\`yaml
### Policy Manifest Sample (YAML uses indentation, never tabs!)
service: portal-api
tls:
  enabled: true
  verify_certificates: true
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing \`yaml.safe_load\`, strict JSON schema validation, linters (\`yamllint\`), and Pull Request policy checks catches misconfigurations and parser vulnerabilities before code ships.
- **Attacker Misuse:** Threat actors inject gadget payloads into unsafe YAML/Java/PHP deserializers to trigger Remote Code Execution, or exploit permissive JSON mass-assignment to inject \`"role": "admin"\` during profile updates.

#### Common Mistakes
- Using single quotes or unquoted keys inside JSON (valid JSON requires double quotes!).
- Mixing tabs and spaces in **YAML** indentation, corrupting hierarchy silently.
- Calling unsafe YAML deserializers (\`yaml.load\`) instead of safe data loaders (\`yaml.safe_load\`).

#### Key Takeaways
- **YAML** structures hierarchy via clean **indentation**; **JSON** encloses double-quoted keys/strings in curly braces (\`{ "name": "Alice", "role": "admin" }\`).
- In Markdown, **\`### Heading\`** creates a **level 3** heading.
- Guard untrusted JSON/YAML inputs against **Insecure Deserialization** by using safe loaders and strict schema validation.

#### Knowledge Check
- Why does \`{ name: 'Alice' }\` fail strict JSON parsing?
- What risk arises if an application feeds untrusted user YAML directly into an unsafe object deserializer?
- Which character creates a level-3 heading in Markdown documentation?

#### Further Learning
Proceed to **Databases, SQL & Data Access** to compare structured document formats like JSON against relational tables and SQL queries.`,
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
        },
        {
          id: 'db-sql-foundations',
          title: 'Databases, SQL & Data Access',
          description: 'Master relational tables, keys, ACID transactions, SQL CRUD & joins, least-privilege DB roles, and parameterized queries.',
          duration: '18 mins',
          content: `### Databases, SQL & Data Access

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Structured Formats (Markdown, JSON, YAML)  

#### Learning Objectives
- Contrast **Relational Databases (RDBMS)**—tables, **Primary Keys**, **Foreign Keys**, and **ACID** guarantees—with document-oriented **NoSQL** stores.
- Read and write core SQL **CRUD** statements (\`SELECT\`, \`INSERT\`, \`UPDATE\`, \`DELETE\`) and **\`JOIN\`** queries cleanly.
- Secure backend data layers using **Least-Privilege DB Roles**, connection pooling, **Parameterized Queries (Prepared Statements)**, and safe ORM usage to eliminate **SQL Injection** before encountering offensive web labs.

#### Why It Matters
Databases store the crown jewels of almost every organization—user credentials, financial ledgers, audit trails, and patient records. If you don't know how SQL statements parse structure versus data, or why least-privilege database roles matter, preventing SQL Injection and multi-tenant data leaks in production stays purely theoretical.

#### Prerequisites & Connections
Building directly on **Structured Formats (Markdown, JSON, YAML)**, this foundational bridge prepares you for Tier 3 **Web Technologies & OWASP Top 10** (where SQL Injection exploitation and remediation are examined deeply) and complements Tier 2 **SIEM & Ingestion Pipelines**.

#### Core Explanation
Application persistence spans data modeling, query execution, and access boundaries:
- **RDBMS vs. NoSQL:** Relational engines (PostgreSQL, MySQL, SQL Server) enforce fixed schemas across tables linked by unique **Primary Keys** and referential **Foreign Keys**, ensuring **ACID** transactions (*Atomicity, Consistency, Isolation, Durability*). **NoSQL** engines (such as MongoDB document stores or Redis key-value caches) favor flexible JSON-like schemas and horizontal scale—requiring equally careful query parameterization!
- **SQL CRUD & Joins:** Applications query rows via \`SELECT\`, create via \`INSERT\`, alter via \`UPDATE\`, remove via \`DELETE\`, and combine normalized tables using \`INNER JOIN\` or \`LEFT JOIN\`.
- **Parameterized Queries (Prepared Statements):** Never concatenate raw user strings directly into SQL text. Prepared statements separate the precompiled SQL query template (\`WHERE email = ?\` or \`$1\`) from user-supplied parameter values sent separately via binary bind parameters—guaranteeing user input can *never* alter SQL syntax.
- **Least-Privilege DB Roles & Pooling:** Applications should connect through managed connection pools under dedicated application DB roles granted *only* \`SELECT/INSERT/UPDATE\` on needed tables—never \`SUPERUSER\`, \`DROP TABLE\`, or schema-admin privileges.

#### How It Works
When a login endpoint executes \`SELECT id, password_hash FROM users WHERE email = $1\` with \`[submittedEmail]\`, the database engine parses and optimizes the query structure *first*, then binds \`submittedEmail\` strictly as an inert literal scalar value. Even if an attacker types \`' OR 1=1 --\`, the engine simply looks for a literal user whose email equals that exact punctuation string—and returns zero rows safely.

#### Real-World Context
Many startups launch with their web backend connecting as the database administrator root user and concatenating a single quick SQL string in a search filter. Years later, one overlooked search parameter grants an attacker full \`DROP\`, \`COPY\`, or \`xp_cmdshell\` access across the whole database server. Separating DB privileges and standardizing prepared statements / parameterized ORMs closes both blast radius and root cause together.

#### Examples
Comparing unsafe dynamic SQL string building against safe parameterized SQL execution:
\`\`\`sql
-- Safe relational join inspecting authorized orders for one verified tenant
SELECT o.id, o.total_cents, u.email
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.tenant_id = $1 AND o.status = $2;
\`\`\`
\`\`\`javascript
// UNSAFE: Untrusted input concatenated into SQL syntax
const badQuery = "SELECT * FROM audit_logs WHERE actor = '" + actorInput + "'";

// SAFE: Prepared statement binds parameter cleanly as literal data
const goodResult = await pool.query(
  "SELECT id, action, created_at FROM audit_logs WHERE actor = $1",
  [actorInput]
);
\`\`\`

#### Security Relevance
- **Defensive Value:** Combining **Parameterized Queries**, scoped tenant \`WHERE\` filters, dedicated **Least-Privilege DB accounts**, and encrypted TLS DB connections blocks SQL Injection and limits post-compromise data tampering.
- **Attacker Misuse:** Threat actors probe search boxes, sorting columns (\`ORDER BY\`), and unparameterized raw ORM queries (like \`.raw()\` helpers) to extract password hashes, tamper with balances, or escalate DB OS commands.

#### Common Mistakes
- Assuming using an ORM automatically stops SQL Injection even when calling raw query escape hatches with string interpolation (\`db.raw(\\\`... \${input}\\\`)\`).
- Connecting the public web tier to PostgreSQL or MySQL using the \`postgres\`/\`root\` superuser account instead of a restricted app role.
- Forgetting \`WHERE\` tenant/user ownership filters on \`UPDATE\` and \`DELETE\` queries.

#### Key Takeaways
- Relational databases link structured tables via **Primary Keys** and **Foreign Keys** under **ACID** transactional guarantees.
- Always execute dynamic queries via **Parameterized Queries (Prepared Statements)** rather than concatenating user inputs into SQL strings.
- Connect web services using **Least-Privilege DB roles**—never database superuser accounts.

#### Knowledge Check
- How does a **Prepared Statement** stop \`' OR '1'='1\` from modifying a SQL query's logic?
- What four properties does **ACID** guarantee in relational transactions?
- Why should an application backend never authenticate to PostgreSQL or MySQL as the database superuser?

#### Further Learning
Review the **OWASP Query Parameterization Cheat Sheet** and continue toward **Web Technologies & OWASP Top 10** to test injection defenses hands-on.`,
          quiz: [
            {
              id: 'q-db-sql-1',
              question: 'In a relational database, what is the primary role of a Foreign Key constraint?',
              options: [
                "To encrypt column values transparently on physical disk blocks",
                "To execute scheduled cron backups across multiple cloud regions",
                "To link a row reliably to a valid Primary Key in another table",
                "To compress large unstructured JSON blobs inside SQL logs"
              ],
              correctOption: 2,
              explanation: 'A Foreign Key references the Primary Key of another table, enforcing referential integrity across related normalized tables.'
            },
            {
              id: 'q-db-sql-2',
              question: 'Why do Prepared Statements (Parameterized Queries) neutralize SQL Injection flaws structurally?',
              options: [
                "They automatically strip all single-quote characters in the user browser.",
                "They require every web visitor to sign queries with an X.509 certificate.",
                "They convert relational tables permanently into read-only JSON snapshots.",
                "They separate compiled SQL command syntax from bound literal parameter data."
              ],
              correctOption: 3,
              explanation: 'Prepared statements precompile the SQL query tree first and bind user inputs purely as literal data parameters, preventing input from altering SQL logic.'
            },
            {
              id: 'q-db-sql-3',
              question: 'Why should a production web application authenticate to its database using a dedicated least-privilege role rather than the DB superuser?',
              options: [
                "To limit blast radius and block administrative commands like DROP or OS access",
                "Because PostgreSQL and MySQL forbid superusers from running SELECT queries",
                "To bypass ACID transactional locking overhead during normal logins",
                "Because superuser database accounts automatically disable TLS encryption"
              ],
              correctOption: 0,
              explanation: 'Granting only required table privileges (such as SELECT/INSERT/UPDATE) prevents compromised application code from dropping schemas, altering roles, or abusing admin extensions.'
            },
            {
              id: 'q-db-sql-4',
              question: 'When can an application built with a modern Object-Relational Mapper (ORM) still remain vulnerable to SQL Injection?',
              options: [
                "Whenever a developer enables database connection pooling in production",
                "When developers bypass the ORM builder via raw interpolated SQL strings",
                "Whenever tables define composite Primary Keys instead of UUID strings",
                "When queries retrieve fewer than ten rows using parameterized filters"
              ],
              correctOption: 1,
              explanation: 'Even safe ORMs expose raw query escape hatches; interpolating user input directly into raw SQL strings reintroduces SQL Injection.'
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
**Prerequisites:** Structured Formats (Markdown, JSON, YAML)  

#### Learning Objectives
- Structure clean, readable **\`.py\` scripts** using Python's core scalar types, zero-indexed **Lists**, and key-value **Dictionaries**.
- Iterate reliably over collections using **\`for item in iterable:\`** loops and conditional logic.
- Avoid hazardous Python patterns (such as \`eval()\` on untrusted strings or \`subprocess(..., shell=True)\`).

#### Why It Matters
Python sits at the center of cybersecurity automation—powering log parsers, SOAR response playbooks, API integrations, YARA tooling, and packet libraries. Mastering Lists and Dictionaries turns raw JSON security telemetry into fast, structured triage utilities.

#### Prerequisites & Connections
Building on **Structured Formats (Markdown, JSON, YAML)** (with **Bash Shell & Core Scripting** recommended), this lesson directly unlocks **File Operations & Regular Expressions** and provides foundational programming concepts ahead of **C & Memory Foundations for Security**.

#### Core Explanation
Effective Python security scripting begins with four clean building blocks:
- **Executable Scripts (\`.py\`):** Saved with the **\`.py\`** extension and executed via \`python3 script.py\`.
- **Lists (\`[...]\`):** Ordered, mutable sequences indexed starting cleanly at **\`0\`** (so \`ports[0]\` accesses the very first element).
- **Dictionaries (\`{key: value}\`):** Mutable hash-mapped key-value structures delivering near-instant lookups—matching parsed JSON logs and asset inventories seamlessly.
- **Iteration (\`for item in collection:\`) & Conditionals:** Python enforces clean indentation and readable loop headers such as **\`for port in port_list:\`** alongside \`if/elif/else\` filtering.

#### How It Works
When parsing JSON threat feeds or SIEM alerts in Python, top-level arrays deserialize directly into **Lists** while event objects map straight into **Dictionaries**. Iterating with \`for alert in alerts:\` and reading \`alert.get("src_ip")\` avoids \`KeyError\` crashes on incomplete log entries safely.

#### Real-World Context
When SOC analysts automate alert enrichment—mapping suspicious internal hostnames against asset owners or counting repeated login failures per source IP—concise 20-line Python dictionary counters replace hours of manual spreadsheet filtering.

#### Examples
Inspecting and iterating cleanly over an authorized lab host inventory dictionary:
\`\`\`python
# safe_inventory.py — Map lab infrastructure safely using Dictionaries and Lists
targets = {
    "edge-fw": "192.0.2.1",
    "web-app": "192.0.2.5",
}
monitored_ports = [22, 80, 443]

print("Primary monitored port:", monitored_ports[0])  # Index 0 = first item (22)
for role, ip in targets.items():
    print(f"Target {role} mapped to {ip}")
\`\`\`

#### Security Relevance
- **Defensive Value:** Writing typed, readable Python utilities using \`.get()\` lookups, \`json.loads\`, and parameterized \`subprocess.run([...])\` builds fast, dependable defensive automation.
- **Attacker Misuse:** Passing untrusted user input into Python \`eval()\`, \`exec()\`, \`pickle.loads()\`, or \`subprocess.run(cmd, shell=True)\` hands attackers immediate Remote Code Execution.

#### Common Mistakes
- Indexing Python lists from \`1\` instead of zero-based index **\`0\`**.
- Using \`dict[key]\` without defensive \`.get(key)\` checks on partial security log schemas.
- Calling \`eval()\` to parse JSON text instead of Python's built-in \`json.loads()\`.

#### Key Takeaways
- Standard Python script files end with the **\`.py\`** extension.
- **Dictionaries** store fast key-value mappings; **Lists** are **zero-indexed** sequences (\`list[0]\` = first element).
- Iterate sequences in Python using **\`for port in port_list:\`**.

#### Knowledge Check
- Given \`ports = [22, 80, 443]\`, what value does \`ports[0]\` return?
- Why is \`alert.get("username", "unknown")\` safer than \`alert["username"]\` when processing varied logs?
- Why should Python scripts always use \`json.loads()\` instead of \`eval()\` or \`pickle.loads()\` on external network inputs?

#### Further Learning
Proceed directly to **File Operations & Regular Expressions** to extract real Threat Indicators out of log files safely.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Python Basics & Data Structures  

#### Learning Objectives
- Manage file handles cleanly using Python **\`with open(...)\` context managers** and standard modes (\`'r'\` read, \`'w'\` overwrite, **\`'a'\`** append).
- Build and apply **Regular Expressions** using Python's built-in **\`re\`** module (e.g., matching exact digits with **\`\\d{4}\`**) to extract Indicators of Compromise (IoCs).
- Prevent **ReDoS** (Regular Expression Denial of Service) and unsafe path-traversal bugs when reading user-supplied filenames.

#### Why It Matters
Threat hunting scripts constantly read local files, extract structured patterns like IP addresses, domains, or timestamps out of messy logs, and append normalized IoCs to investigation reports. Mastering safe file handling and Python's \`re\` engine makes parsing large telemetry reliable and bug-free.

#### Prerequisites & Connections
Building directly on **Python Basics & Data Structures**, this module unlocks **Network Automation & Scapy** and supports Tier 5 **Static Malware Analysis** (regex YARA & string carving).

#### Core Explanation
Safe file processing and pattern matching rest on three fundamentals:
- **Context Managers (\`with open(...)\`):** Guarantees file descriptors close automatically when the block finishes—*even if an exception interrupts processing*—preventing leaked OS file handles or corrupted buffers.
- **File Modes:** Open with \`'r'\` for read-only inspection, \`'w'\` to truncate/create new output, or **\`'a'\`** to **append** new lines safely to the end of existing audit logs without overwriting earlier data.
- **Regular Expressions (\`re\` module):** Python's standard library **\`re\`** compiles pattern rules where \`\\d\` matches any digit and curly braces set exact repetition counts—so **\`\\d{4}\`** matches exactly four consecutive digits (such as a year). Use raw strings (\`r"..."\`) so backslashes aren't interpreted twice by Python!

#### How It Works
Opening \`with open("auth.log", "r", encoding="utf-8") as handle:\` streams lines lazily one by one without loading multi-gigabyte logs entirely into RAM. Applying \`re.findall(r"\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b", line)\` collects candidate IPv4 addresses cleanly for deduping and appending to an analysis file opened in \`'a'\` mode.

#### Real-World Context
Carelessly drafted nested regex quantifiers (such as \`(a+)+\`) can suffer **catastrophic backtracking (ReDoS)**—freezing a security parser CPU at 100% on a single maliciously crafted log line. Keeping regex patterns specific, bounded, and anchored protects ingestion stability.

#### Examples
Carving sample IPv4 indicators and appending safely with a Python context manager:
\`\`\`python
import re

log_line = "Failed SSH login attempt from 198.51.100.120 port 5021"
year_pattern = r"\\d{4}"
ipv4_pattern = r"\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b"

found_ip = re.search(ipv4_pattern, log_line)
if found_ip:
    with open("extracted_iocs.txt", "a", encoding="utf-8") as report:
        report.write(f"{found_ip.group()}\\n")
\`\`\`

#### Security Relevance
- **Defensive Value:** Context managers prevent file descriptor exhaustion, regex extraction speeds up IoC harvesting, and canonical path checking stops directory traversal (\`../\`) when opening supplied filenames.
- **Attacker Misuse:** Attackers craft ReDoS inputs against poorly bounded validation regexes or supply relative \`../../etc/shadow\` filenames to scripts that concatenate user paths directly into \`open()\`.

#### Common Mistakes
- Calling \`open()\` without a \`with\` context manager or forgetting \`.close()\` on exception paths.
- Importing a nonexistent module named \`regex\` instead of standard-library **\`re\`**, or forgetting raw string \`r"..."\` prefixes.
- Opening output reports in overwrite mode \`'w'\` inside loops instead of append mode **\`'a'\`**—erasing prior rows!

#### Key Takeaways
- Use **\`with open(...)\`** context managers so file handles close reliably even when exceptions occur; mode **\`'a'\`** appends data at the end of a file.
- Import Python's standard **\`re\`** library for regex; **\`\\d{4}\`** matches four consecutive digits.

#### Knowledge Check
- What bug is guaranteed to disappear when replacing manual \`f = open(...)\` / \`f.close()\` calls with a \`with open(...)\` block?
- What is the difference between opening a log report in mode \`'w'\` versus mode \`'a'\`?
- Which standard Python module handles regular expression matching?

#### Further Learning
Continue directly to **Network Automation & Scapy** to combine HTTP automation with low-level custom packet crafting.`,
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

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** File Operations & Regular Expressions, Network Topologies, OSI & TCP/IP Reference models  

#### Learning Objectives
- Automate clean HTTP/HTTPS API checks and header verification using Python's **\`requests\`** library (**\`requests.get()\`**, explicit timeouts, verified TLS).
- Construct, stack (\`/\` operator), dissect, and transmit custom multi-layer packets with **Scapy**.
- Send single Layer 3 probes and capture the initial response cleanly via **\`sr1()\`** inside authorized lab networks.

#### Why It Matters
Understanding both high-level HTTP client automation and raw Layer 2/3/4 packet crafting lets security engineers test firewall rules, verify browser security headers across hundreds of endpoints automatically, and inspect unusual protocol responses without relying exclusively on pre-built monolithic scanners.

#### Prerequisites & Connections
Building on **File Operations & Regular Expressions** and **Network Topologies, OSI & TCP/IP Reference models** (with **HTTP, Web Architecture & Browser Trust** recommended for interpreting status codes and response headers), this Tier 1 capstone unlocks programmatic security validation across Tiers 2 and 3.

#### Core Explanation
Python security networking spans Application-Layer clients and raw packet crafting:
- **HTTP Automation (\`requests\`):** Simplifies REST/web checks via **\`requests.get()\`** and \`.post()\`. Always pass explicit timeouts (\`timeout=5\`) and keep TLS verification enabled (\`verify=True\`, the secure default).
- **Scapy Packet Crafting:** Interactive Python framework allowing engineers to define, capture, dissect, and stack protocol layers intuitively using the overloaded forward-slash **\`/\`** operator—for example \`IP(dst="198.51.100.1")/TCP(dport=80, flags="S")\` stacks an IP header atop a TCP SYN segment mirroring OSI encapsulation directly in code.
- **\`sr1()\` (Send and Receive One):** Transmits a crafted Layer 3 packet and waits cleanly for the very **first matched reply packet** (plus optional \`timeout\`), making it ideal for targeted lab ICMP pings or single-port state checks.

#### How It Works
Under the hood, calling \`requests.get("https://portal.example.com/health", timeout=5)\` asks the host OS to resolve DNS, run TCP/TLS handshakes, and parse HTTP status/headers safely. By contrast, crafting \`packet = IP(dst="198.51.100.1")/ICMP()\` in Scapy builds raw protocol bytes explicitly in Python and sends them via raw sockets (requiring elevated lab privileges), returning the decoded reply layer fields directly for inspection.

#### Real-World Context
AppSec teams run scheduled \`requests.get()\` scripts across external domains every morning to verify that every public load balancer still emits \`Strict-Transport-Security\` and \`Content-Security-Policy\` headers—while network engineers use Scapy in isolated labs to confirm stateful firewall rules actually drop malformed or unexpected TCP flag combinations.

#### Examples
Checking HTTP security headers safely with \`requests\` and crafting an authorized lab ICMP probe with Scapy:
\`\`\`python
import requests

# Safe automated HTTP header check with explicit timeout and verified TLS
resp = requests.get("https://portal.example.com", timeout=5)
print("Status:", resp.status_code, "HSTS:", resp.headers.get("Strict-Transport-Security"))
\`\`\`
\`\`\`bash
# Authorized lab verification: stack IP + ICMP layers with '/' and await 1 reply via sr1()
sudo python3 -c "
from scapy.all import IP, ICMP, sr1
packet = IP(dst='198.51.100.1')/ICMP()
reply = sr1(packet, timeout=2, verbose=0)
if reply:
    reply.show()
"
\`\`\`

#### Security Relevance
- **Defensive Value:** Automating security header verification with \`requests\` and validating firewall/IDS signature coverage with Scapy test frames catches regressions immediately.
- **Attacker Misuse:** Attackers write custom Python probing scripts or raw-socket Scapy flood/spoof frames to bypass basic rate limits or fingerprint unusual service banners.

#### Common Mistakes
- Passing \`verify=False\` in \`requests.get()\` and leaving TLS certificate validation turned off in production tools.
- Forgetting \`timeout=\` in \`requests\` or \`sr1()\`, causing automation scripts to hang indefinitely on dropped packets.
- Confusing Scapy's layer-stacking slash operator **\`/\`** with \`+\` or \`>>\`.

#### Key Takeaways
- **Scapy** crafts and dissects custom multi-layer packets, stacking headers with the **\`/\`** operator (\`IP()/TCP()\`).
- **\`sr1()\`** sends a crafted packet and captures the **first matched response**; **\`requests.get()\`** retrieves resources over HTTP/HTTPS.
- Always keep TLS certificate verification enabled and enforce explicit timeouts in automation scripts.

#### Knowledge Check
- How does Scapy's \`IP()/TCP()/Raw()\` syntax mirror the OSI encapsulation model covered earlier in Tier 1?
- Why should every production \`requests.get()\` call include an explicit \`timeout\` and avoid \`verify=False\`?
- What is the operational difference between Scapy's \`send()\` and \`sr1()\` functions?

#### Further Learning
Explore Python \`requests\` session adapters alongside Scapy's official layer-stacking documentation inside an isolated Host-Only lab network.`,
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
