import { Tier } from '../../types';

export const tier4: Tier = {
  id: 'tier-4',
  number: 4,
  title: 'Cloud Security',
  description: 'Deploy secure IAM boundaries, configure cloud firewalls, audit logging metrics across AWS, Azure, and GCP, and harden Kubernetes clusters.',
  topics: [
    {
      id: 'aws-defense',
      title: 'AWS Cloud Defense',
      category: 'defense',
      lessons: [
        {
          id: 'aws-iam-s3',
          title: 'AWS Identity & Storage Security',
          description: 'Harden AWS IAM policies, enforce least privilege, and secure Amazon S3 buckets from public data leaks.',
          duration: '15 mins',
          content: `### AWS Identity & Storage Security

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Enforce least privilege using AWS IAM JSON policies.
- Secure Amazon S3 buckets against unauthorized public exposure.
- Compare cloud compute (EC2) security boundaries.

#### Key Concepts
- **IAM (Identity and Access Management):** AWS service used to securely control access to cloud resources.
- **S3 Bucket (Simple Storage Service):** Object storage service used to store files and documents in the cloud.
- **EC2 (Elastic Compute Cloud):** Virtual machines running in the AWS cloud.
- **Principle of Least Privilege:** Granting users and services only the minimum necessary permissions required to function.

#### Detailed Lesson Content
AWS security starts with **IAM**. Users, groups, and roles are assigned permissions using structured **JSON IAM Policies**. It is essential to avoid using wildcard permissions (\`"Action": "*"\`) and instead enforce the Principle of Least Privilege.
**Amazon S3 buckets** are common targets for data leaks. By default, S3 buckets are private, but misconfigurations can expose them to the public internet. Security teams must enforce **S3 Block Public Access** and use bucket policies to restrict access. Additionally, **EC2 instances** must be isolated using **Security Groups**, which act as virtual stateful firewalls controlling inbound and outbound traffic.`,
          quiz: [
            {
              id: 'q-aws-1',
              question: 'Which AWS IAM policy component defines whether the policy allows or denies access to specified resources?',
              options: [
                'Effect',
                'Action',
                'Resource',
                'Condition'
              ],
              correctOption: 0,
              explanation: 'The "Effect" element in an IAM JSON policy must be set to either "Allow" or "Deny" to define access.'
            },
            {
              id: 'q-aws-2',
              question: 'What is the default access posture for newly created Amazon S3 buckets?',
              options: [
                'Public Read',
                'Public Read/Write',
                'Private (Block All Public Access)',
                'Accessible to any AWS account'
              ],
              correctOption: 2,
              explanation: 'S3 buckets are private by default. Administrators must explicitly modify ACLs or bucket policies to allow external access.'
            },
            {
              id: 'q-aws-3',
              question: 'What is the function of an AWS Security Group?',
              options: [
                'To automatically backup S3 buckets.',
                'To act as a stateful virtual firewall controlling inbound and outbound traffic for EC2 instances.',
                'To manage IAM user passwords.',
                'To distribute DNS routing configurations.'
              ],
              correctOption: 1,
              explanation: 'Security Groups operate at the instance level, acting as stateful firewalls that filter traffic to and from EC2 instances.'
            },
            {
              id: 'q-aws-4',
              question: 'In an AWS IAM JSON policy, what character represents a wildcard that allows all permissions or applies to all resources?',
              options: [
                '?',
                '*',
                '#',
                '@'
              ],
              correctOption: 1,
              explanation: 'The asterisk (*) acts as a wildcard in IAM policies, granting access to all actions or resources, and should be avoided in production environments.'
            }
          ]
        },
        {
          id: 'aws-logging',
          title: 'AWS Audit Logging & Shielding',
          description: 'Deploy CloudTrail for security audits, monitor anomalies with GuardDuty, and configure Security Groups.',
          duration: '15 mins',
          content: `### AWS Audit Logging & Shielding

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** AWS Identity & Storage Security  

#### Learning Objectives
- Deploy CloudTrail to record global AWS API operations.
- Monitor cloud anomalies using GuardDuty threat detection.
- Configure stateful Security Groups and stateless Network ACLs (NACLs).

#### Key Concepts
- **CloudTrail:** Records AWS API calls and user activities across the entire AWS account.
- **GuardDuty:** Continuous security monitoring and threat detection service utilizing machine learning and threat feeds.
- **Network ACL (NACL):** Stateless firewall operating at the VPC subnet level.

#### Detailed Lesson Content
Audit logging is critical for cloud incident response. **AWS CloudTrail** records all API calls made within the account, logging who made the call, when, and from what IP address.
To detect active threats, organizations run **Amazon GuardDuty**, which analyzes VPC flow logs, DNS queries, and CloudTrail events to identify malicious behavior (like EC2 instances communicating with known command-and-control servers or unusual IAM console logins).
Network defense is enforced using both stateful **Security Groups** (which track connection states at the instance level) and stateless **Network ACLs (NACLs)** (which filter traffic at the subnet level).`,
          quiz: [
            {
              id: 'q-awsl-1',
              question: 'Which AWS service records all account API calls and user interactions, providing a complete audit trail for compliance and incident investigations?',
              options: [
                'CloudWatch',
                'CloudTrail',
                'GuardDuty',
                'IAM Analyzer'
              ],
              correctOption: 1,
              explanation: 'CloudTrail captures all API calls made in the account, which is critical for security auditing and tracking modifications to resources.'
            },
            {
              id: 'q-awsl-2',
              question: 'What is a key difference between AWS Security Groups and Network ACLs (NACLs)?',
              options: [
                'Security Groups are stateless; NACLs are stateful.',
                'Security Groups are stateful (operating at the instance level); NACLs are stateless (operating at the subnet level).',
                'Security Groups only filter outbound traffic; NACLs only filter inbound.',
                'NACLs manage IAM accounts; Security Groups do not.'
              ],
              correctOption: 1,
              explanation: 'Security Groups are stateful, automatically allowing return traffic. NACLs are stateless, requiring explicit rules for both inbound and outbound traffic.'
            },
            {
              id: 'q-awsl-3',
              question: 'Which AWS service uses machine learning and threat intelligence to analyze VPC Flow Logs and detect malicious network behavior?',
              options: [
                'CloudTrail',
                'Shield',
                'GuardDuty',
                'Inspector'
              ],
              correctOption: 2,
              explanation: 'GuardDuty is an intelligent threat detection service that analyzes log sources to find indicators of compromise like crypto-mining or port scanning.'
            },
            {
              id: 'q-awsl-4',
              question: 'What happens to traffic that does not match any explicit rule in an AWS Security Group?',
              options: [
                'It is allowed by default.',
                'It is blocked/dropped by default.',
                'It is forwarded to CloudTrail for logging.',
                'It is redirected to an S3 bucket.'
              ],
              correctOption: 1,
              explanation: 'Security Groups use an implicit deny posture: all inbound traffic is blocked by default unless explicitly allowed by a rule.'
            }
          ]
        }
      ]
    },
    {
      id: 'azure-gcp-defense',
      title: 'Azure & GCP Cloud Defense',
      category: 'defense',
      lessons: [
        {
          id: 'azure-security',
          title: 'Microsoft Azure Security',
          description: 'Harden Azure Active Directory identity limits, and monitor events using Microsoft Sentinel SIEM.',
          duration: '18 mins',
          content: `### Microsoft Azure Security

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Enforce identity boundaries in Azure Active Directory (Entra ID).
- Configure Conditional Access policies.
- Query cloud logs using Microsoft Sentinel SIEM.

#### Key Concepts
- **Entra ID (Azure AD):** Cloud-based identity and access management service.
- **Conditional Access:** Rule-based access control engine (e.g., requiring MFA if a user logs in from an untrusted country).
- **Microsoft Defender for Cloud:** Unified security management platform providing posture management and threat protection.
- **Microsoft Sentinel:** Cloud-native SIEM and SOAR platform for threat detection and response across Azure resources.

#### Detailed Lesson Content
**Azure Active Directory (now Entra ID)** handles identity and access management in Microsoft Azure. Defending Entra ID focuses on enforcing **Conditional Access Policies**, which evaluate real-time signals (user group, location, device health) before authorizing logins.
To monitor threats across the enterprise, organizations ingest logs into **Microsoft Sentinel**, Azure\'s cloud-native SIEM, using Kusto Query Language (KQL) to locate security anomalies and automate responses.`,
          quiz: [
            {
              id: 'q-az-1',
              question: 'What is the modern name of Microsoft\'s cloud-based identity and access management service?',
              options: [
                'Active Directory Domain Services (AD DS)',
                'Microsoft Entra ID',
                'Azure IAM Manager',
                'Microsoft Sentinel'
              ],
              correctOption: 1,
              explanation: 'Azure AD was rebranded to Microsoft Entra ID, providing comprehensive cloud identity and directory services.'
            },
            {
              id: 'q-az-2',
              question: 'Which Entra ID feature allows administrators to require Multi-Factor Authentication based on signals like login location or device compliance state?',
              options: [
                'Role-Based Access Control (RBAC)',
                'Conditional Access Policies',
                'Access Reviews',
                'App Registration'
              ],
              correctOption: 1,
              explanation: 'Conditional Access uses "if-then" logic to evaluate signals and enforce security requirements like MFA or block access dynamically.'
            },
            {
              id: 'q-az-3',
              question: 'Which cloud-native SIEM and SOAR platform does Microsoft provide to monitor security logs and automate threat responses across Azure?',
              options: [
                'Microsoft Defender for Cloud',
                'Microsoft Sentinel',
                'Azure Monitor',
                'Entra ID'
              ],
              correctOption: 1,
              explanation: 'Microsoft Sentinel is Azure\'s cloud-native SIEM platform, used to consolidate security logs, detect threats, and automate response workflows.'
            },
            {
              id: 'q-az-4',
              question: 'Which query language is used to search and analyze log data within Microsoft Sentinel?',
              options: [
                'SQL',
                'SPL',
                'Kusto Query Language (KQL)',
                'Python'
              ],
              correctOption: 2,
              explanation: 'KQL (Kusto Query Language) is the standard query language used to search and build alerts within Microsoft Sentinel and Log Analytics workspaces.'
            }
          ]
        },
        {
          id: 'gcp-security',
          title: 'Google Cloud Platform (GCP) Security',
          description: 'Implement GCP IAM hierarchies, deploy Compute Engine shields, and secure Cloud Storage Buckets.',
          duration: '15 mins',
          content: `### Google Cloud Platform (GCP) Security

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Microsoft Azure Security  

#### Learning Objectives
- Enforce GCP resource hierarchies and IAM inheritance.
- Secure Google Compute Engine instances.
- Secure Google Cloud Storage buckets.

#### Key Concepts
- **GCP Resource Hierarchy:** Organization -> Folders -> Projects -> Resources (IAM permissions inherit downwards).
- **Compute Engine:** Secure virtual machine instances running on Google Cloud.
- **Cloud Storage:** Durable and scalable object storage.
- **Service Account:** Special Google Cloud identity used by applications and VM instances to make authorized API calls.

#### Detailed Lesson Content
Google Cloud Platform structures access control using a strict **Resource Hierarchy**. Permissions are assigned at any level (Organization, Folder, Project, or Resource) and are inherited downwards.
Applications running on **Compute Engine** virtual machines authenticate to other GCP services using **Service Accounts**. To prevent compromise, administrators must avoid assigning excessive permissions to service accounts. Additionally, **Cloud Storage Buckets** must be protected using Uniform Bucket-Level Access and public access block rules to prevent sensitive data exposure.`,
          quiz: [
            {
              id: 'q-gcp-1',
              question: 'In the GCP Resource Hierarchy, where do inherited IAM permissions originate at the highest level?',
              options: [
                'Project level',
                'Folder level',
                'Organization level',
                'Resource level'
              ],
              correctOption: 2,
              explanation: 'The Organization is the root node of the GCP hierarchy; any permissions applied at this level inherit down to all folders, projects, and resources.'
            },
            {
              id: 'q-gcp-2',
              question: 'What is the recommended IAM identity type assigned to virtual machines or applications to authorize API requests in GCP?',
              options: [
                'IAM Group',
                'Service Account',
                'Google Workspace User',
                'Cloud KMS Key'
              ],
              correctOption: 1,
              explanation: 'Service Accounts are programmatic identities used by applications and virtual machines to call GCP APIs securely without user credentials.'
            },
            {
              id: 'q-gcp-3',
              question: 'Which feature in Google Cloud Storage guarantees that only IAM policies (and not individual ACLs) define access permissions for bucket objects?',
              options: [
                'Uniform Bucket-Level Access',
                'Object Lifecycle Management',
                'Storage Class Coldline',
                'KMS Key rotation'
              ],
              correctOption: 0,
              explanation: 'Uniform Bucket-Level Access disables object-level ACLs, ensuring that centralized IAM policies manage all access to objects inside the bucket.'
            },
            {
              id: 'q-gcp-4',
              question: 'What is the best-practice policy concerning the use of primitive roles (Viewer, Editor, Owner) in GCP IAM?',
              options: [
                'Always assign Owner roles to all administrators.',
                'Avoid primitive roles in production; instead, use predefined or custom roles to enforce the Principle of Least Privilege.',
                'Use Viewer roles for all database services.',
                'Disable all roles and use root credentials.'
              ],
              correctOption: 1,
              explanation: 'Primitive roles are overly broad. Security teams should use Predefined or Custom roles to restrict permissions to only the necessary APIs.'
            }
          ]
        }
      ]
    },
    {
      id: 'k8s-security',
      title: 'Kubernetes Container Security',
      category: 'defense',
      lessons: [
        {
          id: 'k8s-hardening',
          title: 'Kubernetes Cluster Hardening',
          description: 'Harden Kubernetes clusters using RBAC configurations, network policies, and container secrets.',
          duration: '18 mins',
          content: `### Kubernetes Cluster Hardening

**Difficulty:** Hard  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Restrict cluster access using Role-Based Access Control (RBAC).
- Isolate container communication using Network Policies.
- Manage sensitive credentials securely using Kubernetes Secrets.

#### Key Concepts
- **RBAC (Role-Based Access Control):** Regulates cluster operations based on user and service account roles.
- **Network Policy:** Specifications controlling network packet flows between Kubernetes Pods.
- **Kubernetes Secrets:** Object used to store sensitive information like passwords, OAuth tokens, and SSH keys securely.

#### Detailed Lesson Content
Kubernetes clusters host high-density microservices, requiring robust container-level security.
- **RBAC** restricts who can query the Kubernetes API, defining precisely what Roles and ClusterRoles are authorized to manage resources.
- By default, Kubernetes pods are non-isolated: any pod can communicate with any other pod in the cluster. Security teams must deploy **Network Policies** to act as firewalls, isolating namespaces and restricting traffic between specific microservices (e.g., restricting database pods to receive traffic only from authorized backend API pods).
- Sensitive credentials must never be hardcoded in application code or Dockerfiles; instead, mount them dynamically as **Kubernetes Secrets**.`,
          quiz: [
            {
              id: 'q-k8s-1',
              question: 'What is the default network communication posture for newly created Pods in a standard Kubernetes cluster?',
              options: [
                'All Pods are isolated and cannot communicate.',
                'Non-isolated (any Pod can communicate with any other Pod in the cluster).',
                'Pods can only talk to Pods in the same namespace.',
                'Pods can only communicate with the control plane.'
              ],
              correctOption: 1,
              explanation: 'By default, Kubernetes networking is flat and non-isolated. Network Policies must be configured to restrict traffic between Pods.'
            },
            {
              id: 'q-k8s-2',
              question: 'Which Kubernetes resource restricts API actions (such as get, list, create pods) inside a specific Namespace?',
              options: [
                'ClusterRole',
                'Role',
                'NetworkPolicy',
                'ConfigMap'
              ],
              correctOption: 1,
              explanation: 'A Role defines namespace-specific API permissions, while a ClusterRole applies to the entire cluster across all namespaces.'
            },
            {
              id: 'q-k8s-3',
              question: 'Where should database connection passwords and API tokens be stored in Kubernetes rather than hardcoding them in container images?',
              options: [
                'ConfigMaps',
                'Kubernetes Secrets',
                'Pod environment blocks',
                'Dockerfiles'
              ],
              correctOption: 1,
              explanation: 'Kubernetes Secrets are designed to store sensitive data securely, injecting it into pods as environment variables or mounted files.'
            },
            {
              id: 'q-k8s-4',
              question: 'Which Kubernetes resource restricts network communication pathways between specific Pod labels and Namespaces?',
              options: [
                'ServiceAccount',
                'Network Policy',
                'RBAC Role',
                'Ingress Controller'
              ],
              correctOption: 1,
              explanation: 'Network Policies act as virtual firewalls for Pods, using label selectors to control ingress and egress traffic.'
            }
          ]
        }
      ]
    }
  ]
};

export const tier5: Tier = {
  id: 'tier-5',
  number: 5,
  title: 'Malware Analysis',
  description: 'Learn the principles of static and dynamic malware analysis, extract indicators of compromise (IoCs), and write custom YARA detection rules.',
  topics: [
    {
      id: 'malware-foundations',
      title: 'Malware Foundations & Analysis',
      category: 'defense',
      lessons: [
        {
          id: 'malware-triage',
          title: 'Malware Families & Triage',
          description: 'Identify malware families, analyze PE header structures, and extract static indicators of compromise.',
          duration: '18 mins',
          content: `### Malware Families & Triage

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Classify malware types (Trojans, Ransomware, Rootkits, Infostealers).
- Deconstruct the Portable Executable (PE) file header format.
- Calculate file hashes and extract embedded text strings.

#### Key Concepts
- **PE (Portable Executable):** The standard file format for executable binaries, DLLs, and system files on Windows operating systems.
- **Import Address Table (IAT):** A table in PE files listing the dynamic API functions imported from system libraries (e.g., Kernel32.dll).
- **Indicators of Compromise (IoCs):** Forensic artifacts (file hashes, domain names, IP addresses) that indicate a system has been compromised.

#### Hands-On Lab: Basic Malware Triage
Extract static hashes and text strings from target files using the terminal:
\`\`\`bash
# Calculate the MD5 cryptographic hash of a file
md5sum suspicious_payload.exe

# Extract readable ASCII strings from a binary to find hidden URLs or commands
strings suspicious_payload.exe | grep -i "http"
\`\`\`

#### Detailed Lesson Content
Malware triage is the initial phase of analysis. Before launching dynamic sandboxes, analysts perform static checks:
- **Calculating File Hashes** (MD5, SHA256) allows you to check files against global threat intelligence databases (like VirusTotal).
- **PE Header Analysis** examines the file\'s structure: parsing the **Import Address Table (IAT)** reveals what APIs the binary calls (e.g., importing \`VirtualAlloc\` and \`WriteProcessMemory\` suggests potential process injection behavior).
- **String Extraction** can expose hardcoded domains, IPs, command-line arguments, and error messages that reveal malware intent.`,
          quiz: [
            {
              id: 'q-mal-1',
              question: 'Which section of a Windows PE executable file contains the imported API function names used by the binary?',
              options: [
                '.text',
                '.data',
                'Import Address Table (IAT)',
                '.rsrc'
              ],
              correctOption: 2,
              explanation: 'The IAT lists the external libraries and API functions the program imports from system DLLs, providing clues to its runtime behavior.'
            },
            {
              id: 'q-mal-2',
              question: 'What is the primary function of static malware analysis?',
              options: [
                'Executing the malware inside a sandbox environment.',
                'Analyzing the file\'s structure, metadata, strings, and hashes without executing the binary.',
                'Configuring network firewall rules.',
                'Reinstalling compromised operating systems.'
              ],
              correctOption: 1,
              explanation: 'Static analysis examines the file structure, metadata, strings, and imports to gather clues without risking system infection.'
            },
            {
              id: 'q-mal-3',
              question: 'Which tool extracts human-readable text strings embedded inside binary files?',
              options: [
                'strings',
                'md5sum',
                'lscpu',
                'iptables'
              ],
              correctOption: 0,
              explanation: 'The "strings" utility scans binary files to extract sequences of printable characters, often revealing embedded URLs, file paths, or commands.'
            },
            {
              id: 'q-mal-4',
              question: 'Which malware family focuses on gaining persistent administrative access to a system while hiding its processes and files from the OS?',
              options: [
                'Ransomware',
                'Spyware',
                'Rootkit',
                'Adware'
              ],
              correctOption: 2,
              explanation: 'Rootkits modify operating system kernels or drivers to hide their presence, processes, files, and network sockets from standard detection tools.'
            }
          ]
        },
        {
          id: 'static-analysis',
          title: 'Static Malware Analysis',
          description: 'Analyze executable structures using Ghidra and IDA Free, and write custom YARA detection rules.',
          duration: '20 mins',
          content: `### Static Malware Analysis

**Difficulty:** Hard  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Malware Families & Triage  

#### Learning Objectives
- Use decompilers (Ghidra, IDA Free) to analyze binary code.
- Write custom YARA rules to identify threat signatures.
- Analyze obfuscation techniques used by malware authors (packing, encryption).

#### Key Concepts
- **Disassembler / Decompiler:** Tools (Ghidra, IDA Pro) that translate binary machine code back into Assembly or high-level C code.
- **YARA:** Tool used to identify and classify malware samples based on textual or binary patterns.
- **Obfuscation:** Techniques like packing (e.g., UPX) or encoding used to hide malicious code from static analysis.

#### Hands-On Lab: Writing YARA Rules
Write a custom YARA signature to detect a specific threat family:
\`\`\`yara
rule Detect_Malicious_Strings {
    meta:
        description = "Detects custom test malware based on strings"
        author = "Security Analyst"
    strings:
        $url = "http://malicious-c2-beacon.com"
        $cmd = "cmd.exe /c start"
    condition:
        all of them
}
\`\`\`

#### Detailed Lesson Content
Advanced static analysis utilizes decompilers to reconstruct code logic.
- Tools like **Ghidra** and **IDA Free** translate machine code into readable C structures, allowing analysts to trace execution paths and decode algorithms.
- Malware authors use **Obfuscation** (like packing binaries using UPX or obfuscating strings with XOR) to hinder analysis. Analysts must unpack these binaries before static inspection.
- To detect threat families across systems, analysts write **YARA Rules** that scan files, directories, or process memory for specific text or hexadecimal patterns, triggering alerts on matches.`,
          quiz: [
            {
              id: 'q-sta-1',
              question: 'What is the function of a decompiler in malware analysis?',
              options: [
                'To run malware inside a sandbox.',
                'To translate machine-level binary code into readable high-level pseudo-C code.',
                'To calculate file hashes.',
                'To block network packets.'
              ],
              correctOption: 1,
              explanation: 'Decompilers analyze assembly instructions to reconstruct high-level logical structures (like loops and if-statements) in pseudo-C.'
            },
            {
              id: 'q-sta-2',
              question: 'Which tool uses textual and binary pattern matching rules to identify and classify malware families?',
              options: [
                'Wireshark',
                'Nmap',
                'YARA',
                'Metasploit'
              ],
              correctOption: 2,
              explanation: 'YARA allows analysts to write custom rules defining string, regex, or binary patterns to identify specific malware samples.'
            },
            {
              id: 'q-sta-3',
              question: 'What is "Packing" in the context of malware development?',
              options: [
                'Splitting a payload into multiple ZIP archives.',
                'Compressing and encrypting executable files to obfuscate their code and imports from static detection tools.',
                'Configuring continuous delivery pipelines.',
                'Generating random passwords.'
              ],
              correctOption: 1,
              explanation: 'Packers compress and encrypt executable files, unpacking and executing them in memory at runtime to hinder static analysis.'
            },
            {
              id: 'q-sta-4',
              question: 'Which of the following is a widely used, open-source reverse engineering and decompilation suite created by the NSA?',
              options: [
                'IDA Pro',
                'Ghidra',
                'x64dbg',
                'Cuckoo Sandbox'
              ],
              correctOption: 1,
              explanation: 'Ghidra is an open-source reverse-engineering framework created by the NSA, supporting a wide range of processor architectures and file formats.'
            }
          ]
        },
        {
          id: 'dynamic-analysis',
          title: 'Dynamic Malware Analysis',
          description: 'Execute malware safely inside sandboxes, monitor process behaviors, and trace execution using x64dbg.',
          duration: '22 mins',
          content: `### Dynamic Malware Analysis

**Difficulty:** Hard  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Static Malware Analysis  

#### Learning Objectives
- Set up isolated sandbox environments for dynamic malware analysis.
- Monitor active system modifications (processes, registry edits, network calls) made by executing malware.
- Trace binary execution paths using dynamic debuggers (x64dbg).

#### Key Concepts
- **Dynamic Analysis:** Analyzing malware behavior by executing the binary inside a secure, isolated sandbox environment.
- **Dynamic Debugger (x64dbg):** Tool used to step through program execution line-by-line, inspect memory registers, and modify runtime values.
- **Sandbox:** An isolated, virtualized environment configured to run and analyze untrusted programs safely (e.g., Cuckoo Sandbox).
- **Process Monitor (ProcMon):** Sysinternals utility tracking file, registry, and process activities in real-time.

#### Detailed Lesson Content
**Dynamic Analysis** executes malware inside an isolated virtual machine to capture its actual behavior.
- Before executing samples, analysts prepare monitoring utilities: **Process Monitor (ProcMon)** captures file and registry operations, while **Wireshark** or **Fakenet-NG** intercepts outbound network connections.
- For deep analysis, use a **Dynamic Debugger** like **x64dbg** to pause execution (using breakpoints), step through assembly instructions line-by-line, and inspect CPU registers and memory spaces to analyze decryption keys or command-and-control payloads.`,
          quiz: [
            {
              id: 'q-dyn-1',
              question: 'What is the primary function of dynamic malware analysis?',
              options: [
                'Analyzing code structures without executing the file.',
                'Executing malware inside a secure, isolated sandbox to observe its real-time behaviors, system changes, and network traffic.',
                'Updating antivirus signatures.',
                'Writing software code.'
              ],
              correctOption: 1,
              explanation: 'Dynamic analysis executes the malware in a controlled environment to capture its actual system modifications and network activity.'
            },
            {
              id: 'q-dyn-2',
              question: 'Which tool allows analysts to run binaries line-by-line, set breakpoints, and inspect CPU memory registers in real-time?',
              options: [
                'YARA',
                'x64dbg',
                'Ghidra',
                'ProcMon'
              ],
              correctOption: 1,
              explanation: 'x64dbg is a dynamic debugger used to step through machine instructions and inspect memory states during execution.'
            },
            {
              id: 'q-dyn-3',
              question: 'Which Sysinternals utility is standard for monitoring real-time file system, registry, and process activity during dynamic analysis?',
              options: [
                'Process Explorer (ProcExp)',
                'Process Monitor (ProcMon)',
                'Sysmon',
                'Autoruns'
              ],
              correctOption: 1,
              explanation: 'Process Monitor (ProcMon) captures all file system, registry, and thread activities, making it essential for observing malware behavior.'
            },
            {
              id: 'q-dyn-4',
              question: 'What is the risk of performing dynamic malware analysis on a virtual machine configured with Bridged network adapter mode?',
              options: [
                'The malware will crash.',
                'The malware can scan, attack, or infect other systems on your physical local network (LAN).',
                'It disables the virtualization extensions in the BIOS.',
                'It prevents the VM from booting.'
              ],
              correctOption: 1,
              explanation: 'Bridged adapters connect the VM directly to your physical network, exposing neighboring devices to potential lateral movement or infection if the malware executes.'
            }
          ]
        }
      ]
    }
  ]
};

export const tier6: Tier = {
  id: 'tier-6',
  number: 6,
  title: 'Reverse Engineering',
  description: 'Deconstruct compiled binaries, translate assembly instructions, examine memory registers, and master stack mechanics.',
  topics: [
    {
      id: 'reverse-assembly',
      title: 'Reverse Engineering Assembly',
      category: 'offense',
      lessons: [
        {
          id: 'assembly-foundations',
          title: 'x86/x64 Assembly Foundations',
          description: 'Analyze compiled binaries, translate CPU registers, and study calling conventions.',
          duration: '20 mins',
          content: `### x86/x64 Assembly Foundations

**Difficulty:** Hard  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Interpret basic x86 and x64 assembly instructions.
- Track data flows across general-purpose CPU registers.
- Describe standard system calling conventions.

#### Key Concepts
- **Assembly Language:** Low-level programming language that has a close correspondence with machine code instructions.
- **CPU Registers:** High-speed storage units inside the processor (e.g., EAX, EBX, ECX, EDX).
- **EAX / RAX (Accumulator Register):** Used for arithmetic calculations and holding function return values.
- **Calling Conventions:** Standards defining how functions receive parameters (via stack or registers) and return values (e.g., cdecl, stdcall, fastcall).

#### Detailed Lesson Content
**Reverse Engineering** requires translating binary machine code back into readable low-level instructions. Operating systems compiled from languages like C/C++ run as native machine code.
When disassembled, this code is displayed in **Assembly Language**, which maps machine opcodes to human-readable mnemonics (like \`MOV\`, \`ADD\`, \`SUB\`, \`CMP\`, \`JMP\`).
Understanding general-purpose registers is essential:
- **EAX** (or 64-bit **RAX**) is the accumulator register, commonly holding function return values.
- **ESP** / **RSP** points to the top of the stack.
- **EIP** / **RIP** is the instruction pointer, pointing to the next instruction scheduled for execution.`,
          quiz: [
            {
              id: 'q-rev-1',
              question: 'Which CPU register acts as the Instruction Pointer, holding the address of the next machine instruction scheduled for execution?',
              options: [
                'EAX / RAX',
                'ESP / RSP',
                'EIP / RIP',
                'EBP / RBP'
              ],
              correctOption: 2,
              explanation: 'The Instruction Pointer (EIP/RIP) tracks the CPU\'s current execution point, pointing to the next command to be processed.'
            },
            {
              id: 'q-rev-2',
              question: 'Which register is classically used to store function return values in x86/x64 architectures?',
              options: [
                'EAX / RAX',
                'ECX / RCX',
                'ESI / RSI',
                'EBP / RBP'
              ],
              correctOption: 0,
              explanation: 'The accumulator register (EAX/RAX) is standard for processing arithmetic calculations and returning results from functions.'
            },
            {
              id: 'q-rev-3',
              question: 'What does the assembly instruction "MOV EAX, EBX" execute?',
              options: [
                'Compares the values of EAX and EBX.',
                'Moves/copies the value from EBX into EAX.',
                'Adds the value of EBX to EAX.',
                'Jumps to the memory address in EBX.'
              ],
              correctOption: 1,
              explanation: 'In Intel syntax, "MOV destination, source" copies the data from the source register (EBX) into the destination register (EAX).'
            },
            {
              id: 'q-rev-4',
              question: 'In 64-bit fastcall calling conventions, where are the first few arguments passed to a function?',
              options: [
                'Directly in CPU Registers (RCX, RDX, R8, R9)',
                'Only on the physical Stack',
                'Within the Heap memory segment',
                'Through local environment variables'
              ],
              correctOption: 0,
              explanation: 'To optimize speed, modern 64-bit systems pass the first few function arguments directly in high-speed CPU registers rather than pushing them onto the slower system stack.'
            }
          ]
        },
        {
          id: 'stack-heap-ops',
          title: 'Memory & Stack Operations',
          description: 'Trace memory lifecycles, study stack allocations, and analyze heap operations.',
          duration: '18 mins',
          content: `### Memory & Stack Operations

**Difficulty:** Hard  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** x86/x64 Assembly Foundations  

#### Learning Objectives
- Describe the structure and behavior of the Stack and the Heap.
- Trace stack frame pushes, pops, and local variable allocations.
- Deconstruct buffer overflow mechanics.

#### Key Concepts
- **The Stack:** Structured, LIFO (Last-In, First-Out) memory segment used to store local variables, function arguments, and return addresses.
- **The Heap:** Unstructured, dynamic memory allocation space used for large, variable-sized runtime variables.
- **PUSH:** Instruction that decrements the stack pointer (ESP) and writes data to the top of the stack.
- **POP:** Instruction that reads data from the top of the stack and increments the stack pointer (ESP).

#### Detailed Lesson Content
Programs store runtime variables in two distinct memory structures:
- **The Heap** handles dynamic, runtime-allocated memory (e.g., using \`malloc()\` in C). It grows upwards towards higher memory addresses.
- **The Stack** manages function scopes, growing downwards towards lower memory addresses. When a function is called, a new **Stack Frame** is allocated: parameters are pushed onto the stack, followed by the **Return Address** (the EIP/RIP value to resume execution at after the function returns) and local variables.
Failing to restrict input boundaries in code can allow attackers to overwrite stack memory, replacing the return address with shellcode pointers to execute arbitrary code (a **Buffer Overflow** attack).`,
          quiz: [
            {
              id: 'q-stk-1',
              question: 'Which of the following describes the structure and behavior of the Stack memory segment?',
              options: [
                'Dynamic, unstructured, and accessed via pointers (FIFO).',
                'Structured, Last-In, First-Out (LIFO), growing downwards towards lower memory addresses.',
                'A persistent storage drive partition.',
                'A CPU register block.'
              ],
              correctOption: 1,
              explanation: 'The Stack is a LIFO structure used for fast local variable storage and tracking function execution contexts, growing downwards in memory.'
            },
            {
              id: 'q-stk-2',
              question: 'What is stored in the Stack Frame return address location during a function call?',
              options: [
                'The function\'s first argument.',
                'The CPU instruction address where program execution should resume after the function finishes.',
                'The size of the local variables array.',
                'A pointer to the Heap memory segment.'
              ],
              correctOption: 1,
              explanation: 'The return address is saved on the stack during a function call, telling the CPU where to jump back to when the function finishes.'
            },
            {
              id: 'q-stk-3',
              question: 'Which instruction decrements the stack pointer (ESP/RSP) and writes a value to the top of the stack?',
              options: [
                'PUSH',
                'POP',
                'CALL',
                'RET'
              ],
              correctOption: 0,
              explanation: 'PUSH decrements the stack pointer to allocate space on the stack and writes the specified value to that location.'
            },
            {
              id: 'q-stk-4',
              question: 'What vulnerability occurs when an application writes more data to a stack buffer than it is allocated to hold, overwriting adjacent memory including the return address?',
              options: [
                'SQL Injection',
                'Stack Buffer Overflow',
                'Insecure Deserialization',
                'Server-Side Request Forgery'
              ],
              correctOption: 1,
              explanation: 'A stack buffer overflow occurs when bounds checking is omitted, allowing inputs to overwrite the stack frame and hijack the function return address.'
            }
          ]
        },
        {
          id: 'debugger-tools',
          title: 'Debuggers & Decompilers',
          description: 'Harness debuggers to set breakpoints, inspect runtime registers, and analyze binary execution logic.',
          duration: '18 mins',
          content: `### Debuggers & Decompilers

**Difficulty:** Hard  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Memory & Stack Operations  

#### Learning Objectives
- Use debuggers (x64dbg, GDB) to control binary execution.
- Configure software and hardware breakpoints.
- Modify memory and CPU registers on-the-fly to bypass checks.

#### Key Concepts
- **Software Breakpoint (INT 3 / 0xCC):** Replaces a target instruction with a debug trap opcode, pausing execution when reached.
- **Hardware Breakpoint:** Utilizes dedicated CPU debug registers (DR0-DR3) to pause execution when a memory location is read, written, or executed.
- **Step Over (F8):** Executes the active instruction, stepping over function calls without entering them.
- **Step Into (F7):** Enters the active function call to debug its inner instructions line-by-line.

#### Detailed Lesson Content
Debugging allows you to control program execution at the machine level.
- **Software Breakpoints** are configured by replacing the target opcode with an \`INT 3\` instruction. When reached, the CPU yields control to the debugger, allowing you to inspect registers, memory spaces, and local variables.
- You can modify registers and flags on-the-fly (like setting the Zero Flag after a \`CMP\` check) to force conditional jumps, allowing you to bypass security logic (such as license key checks) during analysis.
- Understanding debugger navigation is essential: **Step Over** executes the active line and pauses at the next, while **Step Into** enters function calls to analyze their internal assembly instructions.`,
          quiz: [
            {
              id: 'q-dbg-1',
              question: 'Which opcode is used on x86/x64 systems to trigger a software breakpoint, pausing execution in a debugger?',
              options: [
                '0x00',
                '0xCC (INT 3)',
                '0x90 (NOP)',
                '0xFF'
              ],
              correctOption: 1,
              explanation: 'Software debuggers insert the 0xCC opcode (representing an "INT 3" interrupt) to halt program execution and return control to the debugger.'
            },
            {
              id: 'q-dbg-2',
              question: 'What is a primary advantage of a Hardware Breakpoint over a Software Breakpoint?',
              options: [
                'Hardware breakpoints do not require CPU support.',
                'Hardware breakpoints can pause execution when a memory location is read or written, without modifying the underlying binary code.',
                'Hardware breakpoints are faster.',
                'Hardware breakpoints do not require a debugger.'
              ],
              correctOption: 1,
              explanation: 'Hardware breakpoints use dedicated CPU registers (DR0-DR3) to monitor memory addresses, allowing you to detect read/write access without altering the program\'s code.'
            },
            {
              id: 'q-dbg-3',
              question: 'Which debugger command executes the active instruction, stepping over function calls without entering them?',
              options: [
                'Step Into (F7)',
                'Step Over (F8)',
                'Continue (F9)',
                'Restart'
              ],
              correctOption: 1,
              explanation: '"Step Over" executes the active line and pauses at the next line in the current function scope, skipping line-by-line debugging of called functions.'
            },
            {
              id: 'q-dbg-4',
              question: 'What technique can analysts use to bypass a license check instruction like "JZ" (Jump if Zero) in a debugger?',
              options: [
                'Replacing the JZ instruction with NOP (No Operation) or modifying the Zero Flag (ZF) register to force the jump.',
                'Deleting the binary file.',
                'Running the file with administrator privileges.',
                'Compiling the file.'
              ],
              correctOption: 0,
              explanation: 'Modifying the Zero Flag or patching the jump instruction (e.g., changing JZ to JNZ or NOP) alters execution logic, bypassing the credential check.'
            }
          ]
        }
      ]
    }
  ]
};

export const tier7: Tier = {
  id: 'tier-7',
  number: 7,
  title: 'Cryptography',
  description: 'Master symmetric and asymmetric encryption algorithms, hashing functions, digital signatures, PKI architectures, and secure TLS channels.',
  topics: [
    {
      id: 'cryptography-foundations',
      title: 'Cryptographic Algorithms',
      category: 'foundations',
      lessons: [
        {
          id: 'sym-asym-enc',
          title: 'Symmetric & Asymmetric Encryption',
          description: 'Compare symmetric block ciphers like AES with asymmetric public-key systems like RSA and ECC.',
          duration: '18 mins',
          content: `### Symmetric & Asymmetric Encryption

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Compare Symmetric and Asymmetric encryption algorithms.
- Explain block cipher modes (ECB vs. CBC).
- Detail asymmetric key exchange processes (DH, RSA, ECC).

#### Key Concepts
- **Symmetric Encryption:** Uses a single shared key for both encryption and decryption (e.g., AES, DES).
- **Asymmetric Encryption:** Uses a mathematically linked key pair: a Public key (for encryption) and a Private key (for decryption) (e.g., RSA, ECC).
- **AES (Advanced Encryption Standard):** Fast symmetric block cipher, standard for securing data-at-rest.
- **ECC (Elliptic Curve Cryptography):** Modern asymmetric algorithm offering high security with shorter key lengths.

#### Detailed Lesson Content
Cryptography is the foundation of digital confidentiality.
- **Symmetric Encryption** is fast and ideal for encrypting large amounts of data (like files or hard drives). However, securely sharing the single key is a challenge.
- **Asymmetric Encryption** solves key distribution: the **Public Key** is shared freely, allowing anyone to encrypt data that only the corresponding **Private Key** can decrypt. This math relies on hard problems like prime factorization (RSA) or elliptic curve logarithms (ECC), which provides strong security with shorter key lengths and lower CPU overhead.`,
          quiz: [
            {
              id: 'q-cry-1',
              question: 'Which of the following describes Symmetric Encryption?',
              options: [
                'Encryption that uses separate public and private keys.',
                'Encryption that uses a single shared key for both encrypting and decrypting data.',
                'A one-way hashing function.',
                'A method of signing digital certificates.'
              ],
              correctOption: 1,
              explanation: 'Symmetric encryption relies on a single shared key, meaning both sender and receiver must possess the identical key securely.'
            },
            {
              id: 'q-cry-2',
              question: 'Why is Elliptic Curve Cryptography (ECC) preferred over traditional RSA in modern mobile and cloud architectures?',
              options: [
                'ECC is a symmetric cipher.',
                'ECC provides equivalent security with much shorter key lengths, reducing CPU and network overhead.',
                'ECC does not use public keys.',
                'ECC is immune to quantum attacks.'
              ],
              correctOption: 1,
              explanation: 'ECC\'s mathematical foundations allow a 256-bit key to provide equivalent security to a 3072-bit RSA key, saving compute resources.'
            },
            {
              id: 'q-cry-3',
              question: 'Which symmetric block cipher mode is considered insecure because it encrypts identical plaintext blocks into identical ciphertext blocks, exposing patterns?',
              options: [
                'Cipher Block Chaining (CBC)',
                'Electronic Codebook (ECB)',
                'Galois/Counter Mode (GCM)',
                'Cipher Feedback (CFB)'
              ],
              correctOption: 1,
              explanation: 'ECB mode lacks diffusion: encrypting identical data blocks (like a flat bitmap image) produces identical ciphertext blocks, exposing structural patterns.'
            },
            {
              id: 'q-cry-4',
              question: 'Which key is used to encrypt a message in an asymmetric system to guarantee that only the intended recipient can read it?',
              options: [
                'The sender\'s private key',
                'The recipient\'s public key',
                'The recipient\'s private key',
                'A shared symmetric key'
              ],
              correctOption: 1,
              explanation: 'Data encrypted with a recipient\'s public key can only be decrypted by their linked private key, guaranteeing confidentiality.'
            }
          ]
        },
        {
          id: 'hash-sig-pki',
          title: 'Hashing, Signatures & PKI',
          description: 'Explore hashing algorithms, HMAC verification, digital signatures, and Public Key Infrastructures.',
          duration: '18 mins',
          content: `### Hashing, Signatures & PKI

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Symmetric & Asymmetric Encryption  

#### Learning Objectives
- Define the properties of cryptographic hashing.
- Verify message integrity using HMAC.
- Explain digital signatures and PKI certificate trust chains.

#### Key Concepts
- **Hashing:** A one-way function that maps inputs to fixed-length output strings (e.g., SHA-256).
- **HMAC (Hash-based Message Authentication Code):** Combines a cryptographic hash function with a secret key to verify both data integrity and authenticity.
- **Digital Signature:** Encrypting a file\'s hash with a private key, proving both integrity and authenticity (non-repudiation).
- **PKI (Public Key Infrastructure):** System of hardware, software, and policies used to manage, distribute, and revoke digital certificates (signed by Certificate Authorities).

#### Detailed Lesson Content
Cryptographic hashes are the foundation of digital integrity.
- **Hashing** takes any input size and produces a fixed-length string (e.g., SHA-256). Hashing is a one-way function: you cannot derive the input from the hash, and any change to the input completely alters the output hash (the avalanche effect).
- **Digital Signatures** combine hashing with asymmetric encryption: the sender hashes a message and encrypts it with their **Private Key**. Anyone can decrypt it using the sender\'s public key, verifying that the message was sent by the owner of that key (authenticity) and remained unaltered (integrity). This trust is verified globally using **PKI Certificates** signed by trusted **Certificate Authorities (CAs)**.`,
          quiz: [
            {
              id: 'q-hsp-1',
              question: 'What is the "Avalanche Effect" in cryptographic hashing?',
              options: [
                'The file size increasing after hashing.',
                'A minor change to the input data completely changes the resulting hash output.',
                'The collision of two hashes.',
                'The speed of hash calculations on GPUs.'
              ],
              correctOption: 1,
              explanation: 'The avalanche effect guarantees that any change (even a single bit modification) produces an entirely different hash, making alterations easy to detect.'
            },
            {
              id: 'q-hsp-2',
              question: 'Which key is used to generate a Digital Signature, proving authenticity and non-repudiation?',
              options: [
                'The sender\'s private key',
                'The sender\'s public key',
                'The recipient\'s public key',
                'A shared symmetric key'
              ],
              correctOption: 0,
              explanation: 'Encrypting a hash with your private key creates a digital signature. Anyone can decrypt it with your public key, proving the signature was generated by you.'
            },
            {
              id: 'q-hsp-3',
              question: 'What is the role of a Certificate Authority (CA) in a Public Key Infrastructure?',
              options: [
                'To encrypt local hard drives.',
                'To act as a trusted third party that issues and signs digital certificates, binding public keys to entities.',
                'To route network packets.',
                'To generate random passwords.'
              ],
              correctOption: 1,
              explanation: 'CAs are trusted anchors that verify identities and issue signed certificates, enabling secure trust relationships across the internet.'
            },
            {
              id: 'q-hsp-4',
              question: 'Which protocol combines a hash function with a secret key, verifying both message integrity and sender authenticity?',
              options: [
                'MD5',
                'HMAC',
                'AES',
                'DH Key Exchange'
              ],
              correctOption: 1,
              explanation: 'HMAC (Hash-based Message Authentication Code) uses a shared secret key to generate the hash, ensuring that only holders of that key can generate or verify the MAC.'
            }
          ]
        },
        {
          id: 'tls-handshake',
          title: 'Transport Layer Security (TLS/SSL)',
          description: 'Harness cryptographic handshakes, secure SSL tunnels, and trace TLS protocol exchanges.',
          duration: '15 mins',
          content: `### Transport Layer Security (TLS/SSL)

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Hashing, Signatures & PKI  

#### Learning Objectives
- Diagram the TLS 1.3 handshake sequence.
- Contrast SSL and TLS standards.
- Explain forward secrecy in modern key exchanges.

#### Key Concepts
- **TLS (Transport Layer Security):** Cryptographic protocol securing communication over computer networks (replaces legacy SSL).
- **TLS Handshake:** Sequence where client and server negotiate cipher suites, authenticate using certificates, and establish session keys.
- **Forward Secrecy:** Security property guaranteeing that compromise of a long-term private key does not expose past session keys.

#### Detailed Lesson Content
Secure web traffic (**HTTPS**) runs over **TLS**. The TLS handshake establishes a secure session:
1. **ClientHello:** The client sends supported TLS versions and cipher suites.
2. **ServerHello:** The server selects parameters and sends its certificate.
3. **Key Exchange:** Client and server negotiate symmetric session keys (e.g., using Diffie-Hellman). Modern TLS 1.3 optimizes this into a single round-trip.
4. **Session Key Encryption:** Future traffic is encrypted using the negotiated symmetric keys.
Modern TLS enforces **Forward Secrecy**: using ephemeral keys guarantees that even if a server\'s private key is stolen in the future, past captured sessions cannot be decrypted.`,
          quiz: [
            {
              id: 'q-tls-1',
              question: 'What security benefit does "Forward Secrecy" provide in modern TLS handshakes?',
              options: [
                'It speeds up connection times.',
                'It guarantees that compromising a server\'s long-term private key does not compromise past encrypted sessions.',
                'It eliminates the need for certificates.',
                'It forces the use of SHA-1.'
              ],
              correctOption: 1,
              explanation: 'Forward secrecy uses ephemeral keys for each session. Compromising the server\'s private key does not reveal session keys, keeping past sessions secure.'
            },
            {
              id: 'q-tls-2',
              question: 'Which protocol succeeds and replaces legacy SSL (Secure Sockets Layer)?',
              options: [
                'HTTPS',
                'TLS (Transport Layer Security)',
                'SSH',
                'IPsec'
              ],
              correctOption: 1,
              explanation: 'TLS is the modern cryptographic standard securing web and network traffic, as legacy SSL versions are deprecated due to security flaws.'
            },
            {
              id: 'q-tls-3',
              question: 'How does TLS 1.3 optimize the connection handshake compared to TLS 1.2?',
              options: [
                'It disables symmetric encryption.',
                'It reduces the handshake to a single round-trip (1-RTT), accelerating key exchanges.',
                'It requires physical hardware keys.',
                'It uses uncompressed XML files.'
              ],
              correctOption: 1,
              explanation: 'TLS 1.3 streamlines negotiations, combining key exchange and handshake packets to establish secure sessions in a single round-trip.'
            },
            {
              id: 'q-tls-4',
              question: 'Which key is used by the client to verify the validity of the server\'s SSL/TLS certificate during a handshake?',
              options: [
                'The server\'s private key',
                'The public key of the trusted Certificate Authority (CA) that signed the certificate',
                'The client\'s private key',
                'A new ephemeral key'
              ],
              correctOption: 1,
              explanation: 'The client uses the public key of the trusted CA (pre-installed in the browser/OS) to decrypt the signature on the certificate, verifying its validity.'
            }
          ]
        }
      ]
    }
  ]
};
