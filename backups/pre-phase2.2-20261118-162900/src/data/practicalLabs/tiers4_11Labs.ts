import { PracticalLab } from '../../types';

export const TIERS_4_11_LABS: PracticalLab[] = [
  // ==========================================
  // TIER 4: CLOUD SECURITY (5 LESSONS)
  // ==========================================
  {
    id: 'lab-aws-iam-s3',
    lessonId: 'aws-iam-s3',
    kind: 'scenario',
    title: 'AWS IAM Policy & S3 Least-Privilege Audit',
    objective: 'Inspect an AWS IAM JSON policy attached to a reporting application and locate the dangerous wildcard violation.',
    shortExplanation: 'Misconfigured IAM policies and public S3 buckets are the #1 cause of cloud breaches. Read the JSON policy below to spot why this application holds full account admin power by mistake.',
    expectedOutcome: 'Identify the over-privileged IAM statement and select the least-privilege fix.',
    xpReward: 75,
    artifactTitle: 'reporting-app-iam-policy.json',
    artifactLanguage: 'json',
    artifactHighlightLines: [5, 6, 7],
    artifactContent: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`,
    challenge: {
      prompt: 'If `reporting-app` only needs to read files from one bucket (`example-lab-reports`), how should lines 6–7 be corrected to enforce Least Privilege?',
      options: [
        'Restrict `"Action"` to `["s3:GetObject"]` and `"Resource"` to `"arn:aws:s3:::example-lab-reports/*"`.',
        'Change `"Effect"` from `"Allow"` to `"Public"` so IAM logs everything.',
        'Keep `"Action": "*"` and remove the `"Resource"` key entirely.',
        'Store AWS root access keys inside the S3 bucket README.'
      ],
      correctIndex: 0,
      hint: 'Replace both wildcards (`*`) with only the exact read action and bucket ARN needed.',
      explanation: 'Using `"Action": "*"` on `"Resource": "*"` grants administrator rights over every service in the AWS account. Scoping `Action` to `s3:GetObject` and `Resource` to the exact bucket ARN enforces Least Privilege.'
    }
  },
  {
    id: 'lab-aws-logging',
    lessonId: 'aws-logging',
    kind: 'log_investigation',
    title: 'AWS CloudTrail & GuardDuty API Investigation',
    objective: 'Examine a simulated AWS CloudTrail event stream to detect unauthorized IAM persistence and logging evasion.',
    shortExplanation: 'CloudTrail records every API request made in an AWS account. Review the four CloudTrail events below and flag the high-risk security tampering event.',
    expectedOutcome: 'Flag the suspicious CloudTrail API call and explain why defenders alert on it immediately.',
    xpReward: 75,
    logContextTitle: 'AWS CloudTrail · Account 000011112222 (us-east-1)',
    suspiciousEntryId: 'ct-3',
    logEntries: [
      {
        id: 'ct-1',
        timestamp: '09:00:12 UTC',
        source: 'ec2.amazonaws.com',
        severity: 'INFO',
        message: 'DescribeInstances by `ci-deploy-role`',
        details: 'SourceIP: 192.0.2.30 | Expected CI/CD inventory check.'
      },
      {
        id: 'ct-2',
        timestamp: '09:04:50 UTC',
        source: 's3.amazonaws.com',
        severity: 'INFO',
        message: 'GetObject `example-lab-assets/logo.png`',
        details: 'SourceIP: 198.51.100.12 | Read-only static web asset.'
      },
      {
        id: 'ct-3',
        timestamp: '09:14:03 UTC',
        source: 'cloudtrail.amazonaws.com',
        severity: 'ALERT',
        message: 'StopLogging called on `org-master-trail` by `temp-dev-user`',
        details: 'SourceIP: 203.0.113.90 | Followed by `CreateAccessKey` for dormant admin account.',
        isSuspicious: true
      },
      {
        id: 'ct-4',
        timestamp: '09:20:44 UTC',
        source: 'iam.amazonaws.com',
        severity: 'INFO',
        message: 'GetAccountSummary by `security-auditor-ro`',
        details: 'SourceIP: 192.0.2.5 | Scheduled read-only compliance posture check.'
      }
    ],
    challenge: {
      prompt: 'Why must `StopLogging` followed by `CreateAccessKey` trigger an urgent GuardDuty/SIEM response?',
      options: [
        'Attackers disable CloudTrail logging to blind defenders before creating persistent IAM access keys.',
        '`StopLogging` is a required step before reading files from S3.',
        '`GetAccountSummary` automatically locks out all EC2 instances.',
        'CloudTrail is only meant for storing static web images.'
      ],
      correctIndex: 0,
      hint: 'Look at what `StopLogging` turns off and why an intruder would invoke it right before `CreateAccessKey`.',
      explanation: 'Stopping CloudTrail is classic defense evasion (MITRE ATT&CK T1562.008), often paired with creating new IAM backdoor keys. Organizations protect CloudTrail using Service Control Policies (SCPs) denying `StopLogging`.'
    }
  },
  {
    id: 'lab-azure-security',
    lessonId: 'azure-security',
    kind: 'scenario',
    title: 'Entra ID Conditional Access & KQL Policy Check',
    objective: 'Audit a Microsoft Entra ID Conditional Access policy and Sentinel KQL query to ensure risky logins require MFA.',
    shortExplanation: 'Modern cloud identity defense checks real-time context—location, device compliance, and sign-in risk—before issuing a token. Review the policy configuration below.',
    expectedOutcome: 'Spot why legacy authentication bypasses weaken the policy and select the right Sentinel hunting approach.',
    xpReward: 75,
    artifactTitle: 'entra-conditional-access.json',
    artifactLanguage: 'json',
    artifactHighlightLines: [4, 7, 8],
    artifactContent: `{
  "policyName": "Require-MFA-For-Admins",
  "state": "enabled",
  "includeUsers": ["Global Administrators"],
  "excludeClientApps": ["Legacy IMAP / POP3"],
  "conditions": {
    "locations": "All locations",
    "deviceState": "Any (unmanaged allowed)"
  },
  "grantControl": "Require MFA"
}`,
    challenge: {
      prompt: 'What dangerous loophole exists in `entra-conditional-access.json` on line 5?',
      options: [
        'Excluding legacy protocols (`Legacy IMAP / POP3`) lets attackers bypass MFA checks because legacy protocols do not support interactive MFA.',
        'Applying the policy to Global Administrators breaks Azure Sentinel.',
        'Requiring MFA across all locations blocks legitimate admins forever.',
        'Azure uses SPL instead of KQL for all Conditional Access rules.'
      ],
      correctIndex: 0,
      hint: 'Look at `excludeClientApps` on line 5—old email protocols often skip modern MFA prompts.',
      explanation: 'Legacy authentication protocols cannot present MFA prompts. Attackers target legacy endpoints to bypass MFA unless legacy authentication is explicitly blocked via Conditional Access.'
    }
  },
  {
    id: 'lab-gcp-security',
    lessonId: 'gcp-security',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'GCP Resource Hierarchy & Inheritance Explorer',
    objective: 'Trace how IAM bindings flow downward through Organization, Folders, Projects, and Resources in Google Cloud Platform.',
    shortExplanation: 'In GCP, permissions granted near the top of the tree automatically apply to everything underneath. Select each hierarchy node to see how inheritance and Uniform Bucket Access work.',
    expectedOutcome: 'Explore all 4 GCP hierarchy tiers and determine where an Organization-wide policy violation originates.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'org',
        label: '1. Organization Node',
        role: 'Root Policy Anchor',
        summary: 'Top-level domain container where Organization Policies (e.g., disallow external public IPs or service account key exports) are enforced downward.',
        details: [
          'IAM bindings here apply across every folder, project, and VM in the company',
          'Should contain minimal break-glass administrators only'
        ],
        securityRelevance: 'Granting broad `Owner` or `Editor` roles at the Organization node exposes the entire cloud estate.',
        sampleMetric: 'Level 1 · Root'
      },
      {
        id: 'folders',
        label: '2. Folders (Prod / Dev / Sandbox)',
        role: 'Environment Isolation Boundaries',
        summary: 'Group projects by department or environment so production workloads stay isolated from developer sandboxes.',
        details: [
          'Allows different security guardrails for `Prod` vs. `Sandbox`',
          'Supports delegated folder-level auditing'
        ],
        securityRelevance: 'Prevents sandbox test permissions from spilling into production.',
        sampleMetric: 'Level 2 · Grouping'
      },
      {
        id: 'projects',
        label: '3. Projects & Service Accounts',
        role: 'Workload Boundary',
        summary: 'Billing and API isolation unit holding Compute Engine VMs and dedicated Service Accounts (`app-worker@proj.iam`).',
        details: [
          'Assign predefined or custom roles to Service Accounts instead of `Editor`',
          'Use short-lived Workload Identity tokens instead of downloadable JSON keys'
        ],
        securityRelevance: 'Over-privileged Service Accounts on a compromised VM let attackers pivot across APIs.',
        sampleMetric: 'Level 3 · Workload'
      },
      {
        id: 'resources',
        label: '4. Cloud Storage & VMs',
        role: 'Leaf Resources',
        summary: 'Individual buckets and VM instances protected by Uniform Bucket-Level Access and VPC firewall rules.',
        details: [
          'Uniform Bucket-Level Access disables legacy object ACLs so IAM policies govern consistently',
          'Public Access Prevention blocks accidental world-readable objects'
        ],
        securityRelevance: 'Eliminates inconsistent per-file permission drift inside Cloud Storage.',
        sampleMetric: 'Level 4 · Resource'
      }
    ],
    challenge: {
      prompt: 'An engineer grants a contractor the primitive `roles/editor` binding at the GCP Organization node instead of a single Sandbox project. What is the security impact?',
      options: [
        'Because GCP IAM permissions inherit downward, the contractor gains modify/delete rights across ALL folders, projects, and resources in the organization.',
        'Nothing happens until the contractor enables Uniform Bucket-Level Access.',
        'Permissions only inherit upward from buckets to folders.',
        'The Organization node blocks primitive roles automatically.'
      ],
      correctIndex: 0,
      hint: 'Remember the direction IAM bindings inherit in the GCP Resource Hierarchy.',
      explanation: 'GCP IAM permissions flow strictly downward: Organization -> Folders -> Projects -> Resources. Use predefined/custom roles scoped to the lowest possible level.'
    }
  },
  {
    id: 'lab-k8s-hardening',
    lessonId: 'k8s-hardening',
    kind: 'scenario',
    title: 'Kubernetes Pod & NetworkPolicy Hardening Lab',
    objective: 'Inspect a Kubernetes deployment manifest and NetworkPolicy to catch container privilege and flat-network risks.',
    shortExplanation: 'By default, pods in a cluster can reach any other pod over the network, and hardcoded secrets inside manifests expose credentials. Inspect the YAML manifest below.',
    expectedOutcome: 'Spot the two container hardening issues in the manifest and identify the correct Kubernetes fix.',
    xpReward: 75,
    artifactTitle: 'payments-api-pod.yaml',
    artifactLanguage: 'yaml',
    artifactHighlightLines: [7, 8, 11],
    artifactContent: `apiVersion: v1
kind: Pod
metadata:
  name: payments-api
  namespace: prod
spec:
  containers:
    - name: api
      image: payments-api:1.4.2
      securityContext:
        privileged: true
      env:
        - name: DB_PASSWORD
          value: "Summer2025!ProdDB"`,
    challenge: {
      prompt: 'Which two fixes properly harden `payments-api-pod.yaml` and isolate its cluster network traffic?',
      options: [
        'Set `privileged: false`, move `DB_PASSWORD` into a `Secret` (`secretKeyRef`), and apply a `NetworkPolicy` restricting pod ingress/egress.',
        'Switch the namespace from `prod` to `default` and enable host network mode.',
        'Replace `payments-api:1.4.2` with `latest` and give the Pod `cluster-admin` RBAC.',
        'Store `DB_PASSWORD` in a public ConfigMap so any pod can read it.'
      ],
      correctIndex: 0,
      hint: 'Review lines 10–13 (`privileged` and plaintext `value`) plus how Kubernetes isolates pod traffic.',
      explanation: 'Running `privileged: true` grants near-root host capabilities, while inline `value:` passwords expose secrets in Git and `kubectl describe`. Use non-root/unprivileged `securityContext`, `Kubernetes Secrets`, and `NetworkPolicy` isolation.'
    }
  },

  // ==========================================
  // TIER 5: MALWARE ANALYSIS (3 LESSONS)
  // ==========================================
  {
    id: 'lab-malware-triage',
    lessonId: 'malware-triage',
    kind: 'terminal',
    title: 'Safe Static Binary Triage Bench',
    objective: 'Compute a file’s SHA-256 hash, extract printable strings, and inspect PE imports safely without executing the sample.',
    shortExplanation: 'Before running any untrusted binary in a sandbox, analysts inspect its static fingerprint and embedded strings. Run the safe triage commands on `sample_dropper.bin`.',
    expectedOutcome: 'Run both static triage tools (`sha256sum` and `strings`) and identify an Indicator of Compromise (IoC).',
    xpReward: 75,
    terminalPromptPrefix: 'analyst@remnux-lab:~$ ',
    requiredCommands: [
      'sha256sum sample_dropper.bin',
      'strings sample_dropper.bin | grep -iE "http|virtualalloc"'
    ],
    terminalCommands: [
      {
        command: 'sha256sum sample_dropper.bin',
        aliases: ['sha256sum', 'md5sum'],
        description: 'Generate cryptographic fingerprint to check threat-intel feeds.',
        flagsSummary: 'Static hash check never executes the file',
        output: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  sample_dropper.bin`,
        interpretation: 'Unique SHA-256 hash can now be queried in VirusTotal or blocked via EDR.'
      },
      {
        command: 'strings sample_dropper.bin | grep -iE "http|virtualalloc"',
        aliases: ['strings'],
        description: 'Extract readable ASCII strings and API imports from the binary.',
        flagsSummary: 'Filters for embedded URLs and memory-allocation APIs',
        output: `VirtualAlloc
WriteProcessMemory
http://198.51.100.77/stage2.bin`,
        interpretation: 'Reveals an embedded stage-2 URL plus APIs commonly used for process memory injection.'
      }
    ],
    challenge: {
      prompt: 'Seeing `VirtualAlloc` and `WriteProcessMemory` in a PE binary’s Import Address Table (IAT) alongside an embedded IP URL suggests what potential capability?',
      options: [
        'Downloading a secondary payload and injecting code into another process’s memory.',
        'Rendering high-resolution JPEG thumbnails safely.',
        'Compressing backup logs into `.tar.gz` archives.',
        'Updating motherboard UEFI certificates.'
      ],
      correctIndex: 0,
      hint: 'Think about what allocating memory (`VirtualAlloc`) and writing into remote memory (`WriteProcessMemory`) enable.',
      explanation: '`VirtualAlloc` + `WriteProcessMemory` are classic Windows API imports used to allocate executable memory and write injected payloads, while the hardcoded URL serves as a network IoC.'
    }
  },
  {
    id: 'lab-static-analysis',
    lessonId: 'static-analysis',
    kind: 'scenario',
    title: 'YARA Signature Rule Builder & Verification',
    objective: 'Read a custom YARA detection rule and evaluate which logic condition avoids false positives while catching the target sample.',
    shortExplanation: 'YARA lets defenders turn malware strings and byte patterns into reusable hunting signatures. Inspect the rule below carefully.',
    expectedOutcome: 'Analyze the YARA strings and condition block to verify accurate matching behavior.',
    xpReward: 75,
    artifactTitle: 'detect_lab_beacon.yar',
    artifactLanguage: 'text',
    artifactHighlightLines: [7, 8, 9, 11],
    artifactContent: `rule Lab_Simulated_Beacon {
    meta:
        author = "SOC Engineering"
        severity = "high"
    strings:
        $mz = { 4D 5A }
        $c2 = "http://198.51.100.77/gate" ascii
        $ua = "LabBeaconAgent/1.0" ascii
    condition:
        $mz at 0 and ($c2 or $ua)
}`,
    challenge: {
      prompt: 'What does the condition `$mz at 0 and ($c2 or $ua)` verify before triggering a YARA alert?',
      options: [
        'The file must begin with Windows PE magic bytes (`4D 5A` = `MZ` at offset 0) AND contain either the C2 URL or custom User-Agent string.',
        'The file must be an empty text file containing no binary bytes.',
        'Both `$c2` and `$ua` must be deleted from memory first.',
        'It executes the binary inside x64dbg automatically.'
      ],
      correctIndex: 0,
      hint: 'Check what hex `4D 5A` (`MZ`) at offset `0` means and how `and` / `or` combine the string variables.',
      explanation: 'Checking `$mz at 0` ensures YARA targets PE executables rather than random log/text files mentioning the URL, while `($c2 or $ua)` catches variants matching either indicator.'
    }
  },
  {
    id: 'lab-dynamic-analysis',
    lessonId: 'dynamic-analysis',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Isolated Malware Sandbox Architecture',
    objective: 'Examine the safety controls required before executing an unknown sample inside a dynamic analysis sandbox.',
    shortExplanation: 'Dynamic analysis runs live code to watch its real behavior—so a single misconfigured network adapter can expose your real LAN. Select each sandbox layer below.',
    expectedOutcome: 'Explore at least 3 sandbox layers and identify the safe network isolation configuration.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'snapshot',
        label: '1. Clean VM Snapshot',
        role: 'Instant Rollback State',
        summary: 'Take a known-clean hypervisor snapshot prior to detonating any sample so you can revert completely afterward.',
        details: [
          'Disable shared clipboard, drag-and-drop, and host shared folders',
          'Never use personal accounts or real credentials inside the guest VM'
        ],
        securityRelevance: 'Host shared folders allow ransomware inside the guest VM to encrypt files on your physical computer.',
        sampleMetric: 'Control: Shared Folders OFF'
      },
      {
        id: 'network',
        label: '2. Host-Only / FakeNet Simulation',
        role: 'Zero Real-Internet Containment',
        summary: 'Place the sandbox on an isolated Host-Only virtual network running FakeNet-NG or INetSim to simulate DNS/HTTP responses safely.',
        details: [
          'Captures C2 requests without letting malware scan your home/office LAN',
          'Never use Bridged mode when analyzing live untrusted binaries'
        ],
        securityRelevance: 'Bridged networking exposes every neighboring device on your physical LAN to worm propagation.',
        sampleMetric: 'Network: Host-Only'
      },
      {
        id: 'procmon',
        label: '3. ProcMon & API Tracing',
        role: 'Runtime Behavioral Capture',
        summary: 'Records file writes, Registry Run keys, spawned processes, and network probes the moment the binary runs.',
        details: [
          'Filter by Process Name to remove baseline OS noise',
          'Captures decrypted payloads even if the binary was UPX-packed on disk'
        ],
        securityRelevance: 'Reveals runtime persistence and dropped artifacts that static string scans missed.',
        sampleMetric: 'Tool: ProcMon / Sysmon'
      }
    ],
    challenge: {
      prompt: 'You are configuring a virtual machine to dynamically observe an unknown executable. Which network and folder setup keeps your physical LAN safe?',
      options: [
        'Host-Only isolated network (with FakeNet/INetSim) and disabled host shared folders/clipboard.',
        'Bridged network mode with full read-write shared folders to `C:\\Users`.',
        'NAT mode connected directly to the corporate Active Directory domain.',
        'Disabling snapshots so changes persist on the physical host.'
      ],
      correctIndex: 0,
      hint: 'Think about preventing malware from reaching neighboring physical hosts or host drives.',
      explanation: 'Host-Only networking paired with simulated internet services (INetSim/FakeNet) and disabled host-guest sharing prevents lateral spread while still capturing all network indicators.'
    }
  },

  // ==========================================
  // TIER 6: REVERSE ENGINEERING (3 LESSONS)
  // ==========================================
  {
    id: 'lab-assembly-foundations',
    lessonId: 'assembly-foundations',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'x86-64 CPU Registers & Instruction Decoder',
    objective: 'Inspect how general-purpose registers (`RAX`, `RCX`, `RSP`, `RIP`) store arguments, stack positions, and the next executed instruction.',
    shortExplanation: 'Disassemblers show machine code as CPU register operations. Select each register below to trace its role in compiled programs.',
    expectedOutcome: 'Explore at least 3 registers and trace the output of a 3-line Intel-syntax assembly block.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'rax',
        label: 'RAX / EAX (Accumulator)',
        role: 'Arithmetic & Return Values',
        summary: 'Primary register for math operations and returning function results back to the caller.',
        details: [
          '`MOV RAX, 0x10` loads 16 into RAX',
          'In `CMP RAX, RBX`, results update CPU status flags (such as Zero Flag)'
        ],
        securityRelevance: 'Inspecting RAX right after a `CALL` shows whether a check returned success (`1`) or failure (`0`).',
        sampleMetric: '64-bit: RAX · 32-bit: EAX'
      },
      {
        id: 'rcx-rdx',
        label: 'RCX, RDX, R8, R9',
        role: 'x64 Fastcall Arguments',
        summary: 'Hold the first four integer/pointer arguments passed into functions on 64-bit Windows (Linux uses RDI, RSI, RDX, RCX).',
        details: [
          'Avoids slow stack pushes for small argument counts',
          'Reveals pointers to strings or buffers passed into APIs'
        ],
        securityRelevance: 'Setting a breakpoint on an API call lets analysts inspect RCX/RDI to read decrypted strings.',
        sampleMetric: 'Role: Function Arguments'
      },
      {
        id: 'rsp',
        label: 'RSP / ESP (Stack Pointer)',
        role: 'Top of Active Stack',
        summary: 'Always points to the lowest address (top) of the active thread stack frame.',
        details: [
          '`PUSH` subtracts 8 (on x64) from RSP and writes data',
          '`POP` reads data and adds 8 to RSP'
        ],
        securityRelevance: 'Stack misalignment or corrupted RSP breaks control flow.',
        sampleMetric: 'Grows: Downward'
      },
      {
        id: 'rip',
        label: 'RIP / EIP (Instruction Pointer)',
        role: 'Next Instruction Address',
        summary: 'Holds the memory address of the very next machine instruction the CPU will fetch and execute.',
        details: [
          'Updated sequentially unless altered by `JMP`, `CALL`, or `RET`',
          'Directly targeted in control-flow hijacking bugs'
        ],
        securityRelevance: 'Controlling RIP allows an attacker to redirect execution flow.',
        sampleMetric: 'Role: Execution Control'
      }
    ],
    challenge: {
      prompt: 'In Intel syntax (`dst, src`), after executing:\n`MOV EAX, 5`\n`MOV EBX, 3`\n`ADD EAX, EBX`\nWhat value is stored in `EAX`?',
      options: [
        '8',
        '2',
        '3',
        '15'
      ],
      correctIndex: 0,
      hint: 'Intel syntax places the destination register first: `ADD EAX, EBX` computes `EAX = EAX + EBX`.',
      explanation: '`MOV EAX, 5` sets `EAX = 5`, `MOV EBX, 3` sets `EBX = 3`, and `ADD EAX, EBX` stores `5 + 3 = 8` back into `EAX`.'
    }
  },
  {
    id: 'lab-stack-heap-ops',
    lessonId: 'stack-heap-ops',
    kind: 'scenario',
    title: 'Stack Frame Layout & Bounds-Check Audit',
    objective: 'Inspect a vulnerable C stack-buffer function and see how writing past a fixed buffer overwrites the saved Return Address.',
    shortExplanation: 'When a function runs, its local array sits right next to the saved Return Address on the stack. Compare the vulnerable C snippet below against safe bounds checking.',
    expectedOutcome: 'Diagnose why `strcpy` compromises the saved Return Address and choose the modern compiler mitigation.',
    xpReward: 75,
    artifactTitle: 'parse_banner.c (Stack Layout Review)',
    artifactLanguage: 'c',
    artifactHighlightLines: [3, 4],
    artifactContent: `void parse_banner(const char *input) {
    char buf[32];          // 32-byte local stack buffer
    // VULNERABLE: no length check against 32-byte buf!
    strcpy(buf, input);    // Overwrites saved RBP + Return Address if > 32 bytes
}

/* Stack layout (higher addresses at bottom):
   [ buf[0..31] ] -> [ Saved RBP (8B) ] -> [ Saved Return Address (RIP) ] */`,
    challenge: {
      prompt: 'If `input` is 64 bytes long, what happens when `strcpy(buf, input)` executes on `buf[32]`—and which mitigation helps stop reliable exploitation?',
      options: [
        'The extra bytes spill past `buf` and overwrite the Saved Return Address; Stack Canaries, ASLR, DEP/NX, and bounds-checked functions (`strncpy`/`snprintf`) mitigate it.',
        'The extra bytes move safely onto the Heap automatically.',
        'The CPU ignores bytes past index 31 without error.',
        'Enabling ECB block cipher mode protects the stack.'
      ],
      correctIndex: 0,
      hint: 'Look at the stack diagram comment on lines 7–8 showing what sits right after `buf[0..31]`.',
      explanation: 'Because the stack grows downward while array writes move upward toward higher addresses, overflowing `buf[32]` overwrites the saved base pointer and return address. Safe bounds checking plus Stack Canaries, NX, and ASLR protect execution.'
    }
  },
  {
    id: 'lab-debugger-tools',
    lessonId: 'debugger-tools',
    kind: 'terminal',
    title: 'GDB Breakpoint & Register Inspection Lab',
    objective: 'Practice stepping through a compiled check function in a simulated debugger to inspect registers and conditional jumps.',
    shortExplanation: 'Debuggers pause a program mid-flight so you can see the exact values in registers right before a branching decision (`CMP` / `JE`). Run the two GDB commands below.',
    expectedOutcome: 'Set a breakpoint, inspect CPU registers, and identify how conditional branches make decisions.',
    xpReward: 75,
    terminalPromptPrefix: '(gdb) ',
    requiredCommands: [
      'break check_license',
      'info registers eax zf'
    ],
    terminalCommands: [
      {
        command: 'break check_license',
        aliases: ['b check_license', 'break'],
        description: 'Insert a software breakpoint (0xCC / INT 3) at `check_license`.',
        flagsSummary: 'Pauses execution whenever CPU reaches `check_license`',
        output: `Breakpoint 1 at 0x40118a: file license.c, line 14.`,
        interpretation: 'Debugger patched the entry byte in memory with `0xCC` to trap execution cleanly.'
      },
      {
        command: 'info registers eax zf',
        aliases: ['info registers', 'i r'],
        description: 'Inspect accumulator (`EAX`) and Zero Flag (`ZF`) right after `CMP EAX, 1`.',
        flagsSummary: 'Shows whether the comparison resulted in equality (`ZF=1`) or mismatch (`ZF=0`)',
        output: `eax            0x0      0
eflags         0x202    [ IF ]   (ZF = 0)`,
        interpretation: '`EAX` is `0` and Zero Flag (`ZF`) is `0`, so the upcoming `JZ valid_branch` jump will NOT be taken.'
      }
    ],
    challenge: {
      prompt: 'When stepping through a program in a debugger (`x64dbg` or `GDB`), what is the difference between **Step Over** and **Step Into**?',
      options: [
        'Step Over runs a `CALL` function as a single step and pauses on the next line; Step Into enters inside the called function to trace its instructions.',
        'Step Over deletes breakpoints; Step Into adds hardware breakpoints.',
        'Step Over edits the file on disk; Step Into formats the stack.',
        'There is no difference between them.'
      ],
      correctIndex: 0,
      hint: 'Consider what happens when the instruction pointer sits on a `CALL helper_func` instruction.',
      explanation: 'Step Over executes a function call completely without diving into its internal instructions (ideal for skipping standard library calls), whereas Step Into enters the callee so you can analyze it line by line.'
    }
  },

  // ==========================================
  // TIER 7: CRYPTOGRAPHY (3 LESSONS)
  // ==========================================
  {
    id: 'lab-sym-asym-enc',
    lessonId: 'sym-asym-enc',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Symmetric AES Modes & Asymmetric Key Exchange Lab',
    objective: 'Compare AES-ECB vs. AES-GCM/CBC and contrast symmetric bulk encryption with asymmetric key exchange (RSA / ECC).',
    shortExplanation: 'Choosing the wrong block cipher mode leaks patterns even when using strong 256-bit AES. Select each cryptographic building block below to examine its properties.',
    expectedOutcome: 'Explore at least 3 blocks and identify why ECB mode leaks data patterns.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'aes-ecb',
        label: 'AES-ECB (Insecure Mode)',
        role: 'Direct Block Mapping — No IV',
        summary: 'Encrypts identical 16-byte plaintext blocks into identical ciphertext blocks, leaving visual and structural patterns visible.',
        details: [
          'No Initialization Vector (IV) or chaining between blocks',
          'Never use ECB for multi-block data or structured records'
        ],
        securityRelevance: 'Classic failure where encrypted images or repeated records reveal recognizable shapes.',
        sampleMetric: 'Status: Avoid'
      },
      {
        id: 'aes-gcm',
        label: 'AES-GCM (Modern Authenticated)',
        role: 'Symmetric Encryption + Integrity Tag',
        summary: 'Uses a unique nonce/IV per message so identical plaintexts produce completely different ciphertexts, AND verifies tampering via an authentication tag.',
        details: [
          'Provides Confidentiality and Integrity (AEAD) in one fast pass',
          'Standard cipher suite in TLS 1.3'
        ],
        securityRelevance: 'Detects ciphertext tampering automatically before decryption completes.',
        sampleMetric: 'Status: Recommended'
      },
      {
        id: 'ecc-rsa',
        label: 'Asymmetric (ECC / RSA)',
        role: 'Public/Private Key Pair',
        summary: 'Solves key distribution over untrusted networks: public key encrypts or verifies, private key decrypts or signs.',
        details: [
          '256-bit ECC matches 3072-bit RSA strength with far lower CPU cost',
          'Too slow for gigabytes of data—used to exchange symmetric AES keys'
        ],
        securityRelevance: 'Combining asymmetric key exchange with symmetric AES gives both safe sharing and high speed.',
        sampleMetric: '256-bit ECC ≈ 3072-bit RSA'
      }
    ],
    challenge: {
      prompt: 'Why do modern protocols like TLS and SSH use asymmetric cryptography (ECC/Diffie-Hellman) to establish a symmetric AES-GCM key instead of encrypting all traffic directly with RSA?',
      options: [
        'Asymmetric math is orders of magnitude slower on large data volumes, whereas symmetric AES-GCM encrypts bulk traffic quickly with authenticated integrity.',
        'RSA cannot encrypt text longer than 1 byte.',
        'Symmetric encryption does not require keys at all.',
        'AES-GCM automatically publishes private keys to DNS.'
      ],
      correctIndex: 0,
      hint: 'Compare the speed of symmetric block ciphers against asymmetric modular/elliptic curve operations.',
      explanation: 'Hybrid cryptography pairs the key-exchange convenience of asymmetric crypto (ECC/DH) with the hardware-accelerated speed and AEAD integrity of symmetric AES-GCM.'
    }
  },
  {
    id: 'lab-hash-sig-pki',
    lessonId: 'hash-sig-pki',
    kind: 'terminal',
    title: 'SHA-256 Avalanche Effect & Signature Lab',
    objective: 'Observe how changing a single character completely alters a SHA-256 hash, and verify how digital signatures prove authenticity.',
    shortExplanation: 'Cryptographic hashes guarantee integrity through the avalanche effect: even a 1-bit change scrambles the entire digest. Test two nearly identical inputs below.',
    expectedOutcome: 'Run both `sha256sum` comparisons and identify which key creates vs. verifies a digital signature.',
    xpReward: 75,
    terminalPromptPrefix: 'crypto@lab:~$ ',
    requiredCommands: [
      'printf "transfer=100" | sha256sum',
      'printf "transfer=101" | sha256sum'
    ],
    terminalCommands: [
      {
        command: 'printf "transfer=100" | sha256sum',
        aliases: ['transfer=100'],
        description: 'Compute SHA-256 digest of original message.',
        flagsSummary: '256-bit one-way cryptographic digest',
        output: `8f4e2a19d80c7b4e119a6e02c49d3b7f8c2a501e74d92b6c10f3a4e5b8d9c012  -`,
        interpretation: 'Deterministic 64-hex-character digest for `transfer=100`.'
      },
      {
        command: 'printf "transfer=101" | sha256sum',
        aliases: ['transfer=101'],
        description: 'Change a single digit (`0` -> `1`) and recompute SHA-256.',
        flagsSummary: 'Demonstrates the cryptographic avalanche effect',
        output: `4b91c7d02e55a8f390c14d7b2a6e81f4930d52b6e7c8a1f0394d2e8b7a6c5019  -`,
        interpretation: 'Changing 1 character alters roughly 50% of all bits—completely unrelated output!'
      }
    ],
    challenge: {
      prompt: 'When Alice sends a software update with a Digital Signature, which key does Alice use to SIGN the hash, and which key do users use to VERIFY it?',
      options: [
        'Alice signs the hash with her Private Key; users verify the signature using Alice’s Public Key (validated by a trusted CA certificate).',
        'Alice signs with her Public Key; users verify with Alice’s Private Key.',
        'Both sides share a single public password in plaintext.',
        'Digital signatures only use MD5 with no keys.'
      ],
      correctIndex: 0,
      hint: 'Only the signer should be able to produce the signature, while everyone should be able to verify it.',
      explanation: 'Signing requires the Private Key (ensuring authenticity and non-repudiation), while anyone holding the corresponding Public Key inside a CA-trusted certificate can verify the signature.'
    }
  },
  {
    id: 'lab-tls-handshake',
    lessonId: 'tls-handshake',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'TLS 1.3 Handshake & Forward Secrecy Walkthrough',
    objective: 'Step through the TLS 1.3 1-RTT handshake to see how cipher negotiation, CA verification, and ephemeral session keys work.',
    shortExplanation: 'Every HTTPS lock icon relies on a fast cryptographic handshake before any web page data moves. Step through the 4 stages of a TLS 1.3 connection.',
    expectedOutcome: 'Step through all 4 TLS stages and explain what Forward Secrecy protects.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'tls-1',
        label: '1. ClientHello + Key Share',
        role: 'Browser Initiates Handshake',
        summary: 'Browser sends supported TLS 1.3 cipher suites, SNI hostname, and its ephemeral Diffie-Hellman (ECDHE) public key share in the very first packet.',
        details: [
          'Includes random nonce to prevent replay attacks',
          'Sending the key share upfront saves a full network round-trip (1-RTT)'
        ],
        securityRelevance: 'Legacy SSL/TLS 1.0–1.1 downgrade attempts are rejected.',
        sampleMetric: 'Flight 1 · Client -> Server'
      },
      {
        id: 'tls-2',
        label: '2. ServerHello + Certificate',
        role: 'Server Identity & Ephemeral Share',
        summary: 'Server picks the strongest cipher (e.g., TLS_AES_256_GCM_SHA384), sends its ephemeral ECDHE share, and transmits its CA-signed X.509 certificate.',
        details: [
          'Both sides immediately derive ephemeral symmetric session keys',
          'Certificate proves the server owns the domain via the OS/browser CA trust store'
        ],
        securityRelevance: 'Expired, self-signed, or mismatched-domain certificates trigger browser security warnings.',
        sampleMetric: 'Flight 2 · Server -> Client'
      },
      {
        id: 'tls-3',
        label: '3. Certificate Verify & Finished',
        role: 'Transcript Authentication',
        summary: 'Server signs the handshake transcript with its private key; client verifies the CA chain and signature before sending encrypted HTTP.',
        details: [
          'Proves the server actually possesses the private key matching its certificate',
          'All application headers, cookies, and body bytes are now encrypted'
        ],
        securityRelevance: 'Stops Man-in-the-Middle impersonation even if an attacker intercepts raw packets.',
        sampleMetric: 'State: Verified Tunnel'
      },
      {
        id: 'tls-4',
        label: '4. Ephemeral Destruction (Forward Secrecy)',
        role: 'Past Sessions Stay Safe',
        summary: 'Once the session closes, temporary ECDHE session keys are wiped from memory.',
        details: [
          'Even if a server’s long-term TLS certificate private key is compromised next year, recorded past traffic cannot be decrypted',
          'Unique session keys per connection'
        ],
        securityRelevance: 'Defeats "harvest now, decrypt later" passive traffic collection.',
        sampleMetric: 'Property: Forward Secrecy'
      }
    ],
    challenge: {
      prompt: 'An attacker records encrypted HTTPS traffic today and steals the web server’s long-term private certificate key a year later. Why can they STILL not decrypt those past TLS 1.3 sessions?',
      options: [
        'TLS 1.3 enforces Forward Secrecy using temporary ephemeral ECDHE keys per session that are discarded afterward.',
        'TLS 1.3 stores all past session keys inside public DNS TXT records.',
        'HTTPS traffic is never encrypted in TLS 1.3.',
        'The server private key automatically changes the browser URL.'
      ],
      correctIndex: 0,
      hint: 'Check Stage 4 covering ephemeral ECDHE keys.',
      explanation: 'Because the actual symmetric session key is derived from ephemeral ECDHE exchanges discarded after the session ends, stealing the long-term signing key later does not reveal past session keys.'
    }
  },

  // ==========================================
  // TIER 8: GRC (2 LESSONS)
  // ==========================================
  {
    id: 'lab-infosec-frameworks',
    lessonId: 'infosec-frameworks',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'NIST CSF, ISO 27001 & SOC 2 Control Mapper',
    objective: 'Map real security controls to NIST Cybersecurity Framework functions and compare ISO 27001, SOC 2, and CIS Controls.',
    shortExplanation: 'Governance frameworks turn scattered technical tools into a measurable security program. Explore each framework below to see when organizations adopt it.',
    expectedOutcome: 'Explore at least 3 frameworks and match a real engineering control to its NIST CSF function.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'nist-csf',
        label: 'NIST CSF (5 Core Functions)',
        role: 'Identify · Protect · Detect · Respond · Recover',
        summary: 'Organizes technical and operational security into five continuous lifecycle functions aligned with business risk.',
        details: [
          'Identify: asset inventory & risk assessment | Protect: MFA, patching, training',
          'Detect: SIEM & EDR alerts | Respond: IR containment | Recover: backup restoration'
        ],
        securityRelevance: 'Gives leadership and engineering teams a shared vocabulary for measuring maturity.',
        sampleMetric: 'Model: Risk Lifecycle'
      },
      {
        id: 'iso-27001',
        label: 'ISO/IEC 27001',
        role: 'Global ISMS Certification',
        summary: 'International standard requiring a formal, audited Information Security Management System (ISMS) with continuous risk treatment.',
        details: [
          'Widely requested by global enterprise customers',
          'Paired with Annex A controls covering access, crypto, and supplier security'
        ],
        securityRelevance: 'Proves governance rigor through independent external certification.',
        sampleMetric: 'Scope: Global ISMS'
      },
      {
        id: 'soc-2',
        label: 'SOC 2 Type II',
        role: 'Service Organization Trust Report',
        summary: 'Evaluates SaaS and cloud vendors over an observation window (e.g., 6–12 months) against Trust Services Criteria.',
        details: [
          'Security (Common Criteria) is always mandatory; Availability, Integrity, Confidentiality, Privacy are optional',
          'Type II verifies controls actually operated over time, not just on one day'
        ],
        securityRelevance: 'Core compliance requirement for B2B cloud software vendors.',
        sampleMetric: 'Mandatory: Security'
      },
      {
        id: 'cis',
        label: 'CIS Controls',
        role: 'Prioritized Technical Safeguards',
        summary: 'Action-oriented checklist grouped into Implementation Groups (IG1–IG3) to eliminate common attack paths first.',
        details: [
          'Starts with asset inventory, MFA, patching, and secure configurations',
          'Practical roadmap for small teams with limited budgets'
        ],
        securityRelevance: 'Helps teams fix the highest-impact technical exposures first.',
        sampleMetric: 'Focus: Actionable Hygiene'
      }
    ],
    challenge: {
      prompt: 'A team deploys SIEM correlation rules and Sysmon alerts to spot suspicious logins in real time, plus offline immutable backups to rebuild servers after ransomware. Which two NIST CSF functions do those map to?',
      options: [
        'Detect (SIEM/Sysmon alerting) and Recover (backup restoration).',
        'Identify (backdrops) and Repudiation (password resets).',
        'Protect (SIEM alerts) and Spoofing (backups).',
        'SOC 2 Type I and PCI-DSS.'
      ],
      correctIndex: 0,
      hint: 'Match spotting active anomalies (`Detect`) and restoring operations (`Recover`) to the 5 NIST CSF verbs.',
      explanation: 'Monitoring telemetry to discover threats belongs to **Detect**, while restoring affected services and data from clean backups belongs to **Recover**.'
    }
  },
  {
    id: 'lab-compliance-standards',
    lessonId: 'compliance-standards',
    kind: 'scenario',
    title: 'Regulatory Compliance Gap Audit (GDPR, HIPAA, PCI-DSS)',
    objective: 'Audit a fictional multi-service architecture summary against GDPR, HIPAA, and PCI-DSS rules to spot compliance gaps.',
    shortExplanation: 'Different regulations protect specific data types—consumer personal data (GDPR/CCPA), healthcare records (HIPAA), and payment cards (PCI-DSS). Review the system checklist below.',
    expectedOutcome: 'Spot the regulatory violation in the architecture checklist and pair it with the governing standard.',
    xpReward: 75,
    artifactTitle: 'compliance-readiness-audit.txt',
    artifactLanguage: 'text',
    artifactHighlightLines: [3, 6, 8],
    artifactContent: `SYSTEM A (EU User Portal):
  - Stores EU user emails & addresses; deletion requests take 180 days (manual backlog).
SYSTEM B (Clinic Patient App):
  - Stores patient PHI diagnoses encrypted with AES-256 at rest and TLS 1.3 in transit.
SYSTEM C (Checkout API):
  - Logs full 16-digit PAN + CVV codes in plaintext debug files on shared dev server.`,
    challenge: {
      prompt: 'Which two critical compliance violations appear in `compliance-readiness-audit.txt`?',
      options: [
        'System C violates PCI-DSS by storing CVV and unencrypted PANs in debug logs; System A risks GDPR penalties by failing timely Right-to-Erasure deletion.',
        'System B violates HIPAA because AES-256 encryption is prohibited on patient records.',
        'System A violates PCI-DSS because it uses EU email addresses.',
        'All three systems are fully compliant with zero gaps.'
      ],
      correctIndex: 0,
      hint: 'Inspect System A (GDPR erasure rights) and System C (PCI-DSS cardholder data rules).',
      explanation: 'PCI-DSS strictly prohibits storing CVV/CVC security codes after authorization and requires protecting PANs; GDPR mandates honoring data erasure requests without undue delay (typically within 30 days).'
    }
  },

  // ==========================================
  // TIER 9: CAPTURE THE FLAG (2 LESSONS)
  // ==========================================
  {
    id: 'lab-ctf-formats',
    lessonId: 'ctf-formats',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'CTF Strategy & Flag Hunting Methodology',
    objective: 'Compare Jeopardy-style vs. Attack-Defense CTF formats and practice a structured methodology for solving challenges efficiently.',
    shortExplanation: 'CTF competitions sharpen real-world troubleshooting under time pressure. Select each CTF mode and workflow step below.',
    expectedOutcome: 'Inspect all 3 CTF cards and choose the right first-minute move in an Attack-Defense competition.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'jeopardy',
        label: 'Jeopardy-Style CTF',
        role: 'Category Board & Point Tiers',
        summary: 'Teams solve independent challenges across Web, Crypto, Forensics, Reverse Engineering, and Pwn to submit `FLAG{...}` tokens.',
        details: [
          'Great for beginners and specialists dividing categories across a team',
          'Start with easy 50–100 pt warmups to build momentum'
        ],
        securityRelevance: 'Builds repeatable reconnaissance, decoding, and debugging habits.',
        sampleMetric: 'Format: Challenge Board'
      },
      {
        id: 'attack-defense',
        label: 'Attack-Defense CTF',
        role: 'Live Patching + Exploiting Peers',
        summary: 'Each team hosts identical vulnerable services—teams must patch their own service WITHOUT breaking uptime while exploiting opponents.',
        details: [
          'SLA checks dock points if your patch breaks legitimate functionality',
          'Network packet captures reveal opponent exploits so you can patch fast'
        ],
        securityRelevance: 'Mirrors real blue-team incident response + purple-team validation under fire.',
        sampleMetric: 'Format: Live Red + Blue'
      },
      {
        id: 'writeups',
        label: 'Reproducible Note-Taking',
        role: 'Document Commands & Root Cause',
        summary: 'Recording inputs, offsets, and why a bug worked turns a solved flag into lasting engineering skill.',
        details: [
          'Capture exact payloads and remediation notes in Lab Scratchpad',
          'Great portfolio artifacts for security interviews'
        ],
        securityRelevance: 'Top analysts solve problems systematically rather than guessing randomly.',
        sampleMetric: 'Habit: Writeups'
      }
    ],
    challenge: {
      prompt: 'In an Attack-Defense CTF, your team receives shell access to your own vulnerable web server at minute 1. What should you do BEFORE attacking other teams?',
      options: [
        'Inspect running services, snapshot/back up configs, change default credentials, and audit/patch vulnerabilities while verifying SLA uptime.',
        'Turn off the web server permanently so nobody can connect.',
        'Publish your own server’s `/flag.txt` in public chat.',
        'Delete all log files so SLA checkers fail.'
      ],
      correctIndex: 0,
      hint: 'In Attack-Defense CTFs, losing uptime costs SLA points and leaving default bugs open leaks your flags every tick.',
      explanation: 'Securing default credentials, capturing baseline backups, and patching flaws without breaking service SLA availability prevents opponents from farming flags from your box.'
    }
  },
  {
    id: 'lab-ctf-skills',
    lessonId: 'ctf-skills',
    kind: 'terminal',
    title: 'Mini Forensics & Web Decoding CTF Challenge',
    objective: 'Inspect an encoded HTTP parameter and decode a simulated local challenge artifact to recover the practice flag cleanly.',
    shortExplanation: 'CTF challenges often combine quick inspection with encoding awareness (Base64, URL path traversal checks). Run the two inspection commands below to solve this safe mini-challenge.',
    expectedOutcome: 'Decode the simulated Base64 token and diagnose the web path traversal flaw.',
    xpReward: 75,
    terminalPromptPrefix: 'player@ctf-box:~$ ',
    requiredCommands: [
      'cat challenge_hint.txt',
      'echo "RkxBR3tsYWJfdHJhdmVyc2FsX2NoZWNrfQ==" | base64 -d'
    ],
    terminalCommands: [
      {
        command: 'cat challenge_hint.txt',
        aliases: ['cat'],
        description: 'Inspect the challenge artifact note.',
        flagsSummary: 'Reads captured HTTP query log + encoded token',
        output: `GET /download?file=../../../../etc/passwd HTTP/1.1
Token: RkxBR3tsYWJfdHJhdmVyc2FsX2NoZWNrfQ==`,
        interpretation: 'Look at the `../` directory traversal attempt and Base64 token ending in `==`.'
      },
      {
        command: 'echo "RkxBR3tsYWJfdHJhdmVyc2FsX2NoZWNrfQ==" | base64 -d',
        aliases: ['base64 -d', 'base64'],
        description: 'Decode the Base64 token string.',
        flagsSummary: '-d decodes Base64 input back to plaintext UTF-8',
        output: `FLAG{lab_traversal_check}`,
        interpretation: 'Decoded practice flag verified: `FLAG{lab_traversal_check}`.'
      }
    ],
    challenge: {
      prompt: 'How should a web developer fix the `/download?file=../../../../etc/passwd` Directory Traversal vulnerability seen in `challenge_hint.txt`?',
      options: [
        'Map allowed file IDs via an allowlist or resolve the canonical path (`path.resolve`) and verify it stays strictly inside the intended uploads directory.',
        'Encode the filename in Base64 in the browser before sending it.',
        'Hide the `/download` link from the navigation bar CSS.',
        'Rename `/etc/passwd` to `/etc/users`.'
      ],
      correctIndex: 0,
      hint: 'Encoding or hiding UI links does not stop forged HTTP requests; server-side path canonicalization + allowlisting does.',
      explanation: 'Canonicalizing the resolved path and confirming it starts with the safe base directory (or referencing immutable file IDs from an allowlist) eliminates `../` traversal escapes.'
    }
  },

  // ==========================================
  // TIER 10: CERTIFICATIONS (2 LESSONS)
  // ==========================================
  {
    id: 'lab-entry-certs',
    lessonId: 'entry-certs',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Entry-Level Certification Pathway Planner',
    objective: 'Compare Network+, CCNA, Security+, and eJPT across exam style, prerequisites, and target entry roles.',
    shortExplanation: 'Choosing the right first certification depends on whether you need networking fundamentals, broad baseline security, or hands-on lab validation. Select each certification card below.',
    expectedOutcome: 'Compare at least 3 certifications and match a learner profile to the best starting credential.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'net-ccna',
        label: 'Network+ / Cisco CCNA',
        role: 'Networking Foundations',
        summary: 'Builds fluency in subnetting, VLANs, routing tables, DNS, and packet flows—critical before defending or pentesting.',
        details: [
          'Network+ = vendor-neutral fundamentals | CCNA = deeper hands-on routing/switching CLI',
          'Solves the #1 beginner gap in technical interviews'
        ],
        securityRelevance: 'You cannot spot anomalous traffic in Wireshark without knowing normal routing and TCP/IP.',
        sampleMetric: 'Focus: TCP/IP & Routing'
      },
      {
        id: 'sec-plus',
        label: 'CompTIA Security+',
        role: 'Broad Industry Baseline',
        summary: 'Multiple-choice + performance-based credential validating core security controls, crypto, IAM, SOC triage, and GRC vocabulary.',
        details: [
          'Widely recognized by HR filters and government/enterprise entry roles',
          'Best paired with hands-on home labs or CTFs so you can demonstrate practical skill'
        ],
        securityRelevance: 'Establishes core defensive and risk literacy across all domains.',
        sampleMetric: 'Format: Multiple Choice + PBQ'
      },
      {
        id: 'ejpt',
        label: 'eJPT (Junior Penetration Tester)',
        role: '100% Hands-On Lab Exam',
        summary: 'Practical assessment inside a live virtual network requiring Nmap scanning, web checks, and host pivoting.',
        details: [
          'Proves you can actually operate tools rather than just memorize definitions',
          'Strong bridge toward intermediate offensive certs'
        ],
        securityRelevance: 'Demonstrates practical enumeration and troubleshooting under realistic lab conditions.',
        sampleMetric: 'Format: Live Lab Exam'
      }
    ],
    challenge: {
      prompt: 'A learner already understands TCP/IP and wants an entry-level credential specifically designed to prove hands-on enumeration and exploitation skills in a live virtual network. Which fits best?',
      options: [
        'eJPT (Junior Penetration Tester)',
        'CISSP',
        'OSCP',
        'PCI-DSS'
      ],
      correctIndex: 0,
      hint: 'CISSP requires 5 years of experience and OSCP is advanced; pick the entry-level hands-on lab cert.',
      explanation: 'eJPT is an entry-level, 100% practical assessment validating real enumeration, pivoting, and exploitation inside a live lab environment.'
    }
  },
  {
    id: 'lab-advanced-certs',
    lessonId: 'advanced-certs',
    kind: 'scenario',
    title: 'Career Role-to-Certification Alignment Check',
    objective: 'Evaluate candidate backgrounds against OSCP, CEH, and CISSP requirements (experience rules, practical labs, and leadership domains).',
    shortExplanation: 'Investing months in the wrong advanced certification wastes time if experience prerequisites or role goals do not align. Audit the three candidate profiles below.',
    expectedOutcome: 'Match the right advanced certification to each career trajectory and spot an eligibility misconception.',
    xpReward: 75,
    artifactTitle: 'certification-readiness-cases.txt',
    artifactLanguage: 'text',
    artifactHighlightLines: [2, 5, 8],
    artifactContent: `CASE A (1 yr SOC Analyst):
  Goal: Transition into full-time hands-on Penetration Testing. Wants a rigorous 24-hour practical lab exam.
CASE B (6 yrs Security Engineer):
  Goal: Move into Security Architecture / CISO-track leadership covering 8 enterprise security domains.
CASE C (Recent Graduate, 0 yrs experience):
  Claim: "Passing the CISSP exam tomorrow makes me a full CISSP immediately without work verification."`,
    challenge: {
      prompt: 'How should Cases A, B, and C be advised accurately?',
      options: [
        'Case A targets OSCP; Case B targets CISSP; Case C’s claim is false because full CISSP requires 5 years of verified paid experience (otherwise you become an Associate of ISC2).',
        'Case A targets CISSP; Case B targets Network+; Case C receives full CISSP immediately.',
        'OSCP is a 90-minute multiple-choice test with no reporting.',
        'CISSP covers only Linux bash scripting and nothing else.'
      ],
      correctIndex: 0,
      hint: 'Check the 24-hour practical requirement of OSCP and the 5-year work experience rule of CISSP.',
      explanation: 'OSCP is the 24-hour practical pentesting benchmark (Case A), CISSP validates 8 leadership/engineering domains with 5 years of verified experience (Case B), and passing without 5 years grants Associate status until experience is met (Case C).'
    }
  },

  // ==========================================
  // TIER 11: CAREER PREPARATION (2 LESSONS)
  // ==========================================
  {
    id: 'lab-portfolio-resumes',
    lessonId: 'portfolio-resumes',
    kind: 'scenario',
    title: 'Cybersecurity Resume & Portfolio Impact Audit',
    objective: 'Compare a vague, unreadable resume snippet against a quantified, ATS-friendly bullet backed by a documented home lab.',
    shortExplanation: 'Hiring managers and ATS parsers look for concrete tools, measurable outcomes, and reproducible lab writeups. Compare the two resume versions below.',
    expectedOutcome: 'Identify why Version B passes ATS filters and impresses SOC hiring managers.',
    xpReward: 75,
    artifactTitle: 'soc-resume-comparison.md',
    artifactLanguage: 'markdown',
    artifactHighlightLines: [3, 7, 8],
    artifactContent: `# VERSION A (Weak / Non-ATS):
[Two-column graphic image PDF]
"Cybersecurity enthusiast. Know Linux, networking, and security tools. Hard worker."

# VERSION B (Strong / ATS + Portfolio):
"Home SOC Lab (GitHub Writeup): Deployed Wazuh SIEM + Sysmon across 3 VMs;
authored 6 correlation rules detecting encoded PowerShell & brute-force SSH,
reducing simulated triage time in documented incident playbooks."`,
    challenge: {
      prompt: 'Which three improvements make Version B dramatically stronger for landing an entry-level SOC Analyst interview?',
      options: [
        'Plain parseable text (ATS-safe), named tools/telemetry (SIEM + Sysmon), and verifiable GitHub home-lab evidence showing concrete detection output.',
        'Using bright neon tables embedded inside a JPEG image.',
        'Listing only vague buzzwords with zero project links.',
        'Replacing technical skills with unrelated hobbies.'
      ],
      correctIndex: 0,
      hint: 'Compare how ATS software parses plain text vs. graphics, and what concrete proof Version B gives a hiring manager.',
      explanation: 'Version B uses clean text that ATS parsers read accurately, surfaces real keywords (`SIEM`, `Sysmon`, `correlation rules`), and links to reproducible lab documentation demonstrating practical skill.'
    }
  },
  {
    id: 'lab-interviews-networks',
    lessonId: 'interviews-networks',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'Technical Interview Scenario Simulator',
    objective: 'Practice structuring a clear, calm technical interview answer when asked: "You see an alert for an internal host beaconing to an unknown external IP—walk me through your steps."',
    shortExplanation: 'Interviewers test your structured thinking more than trivia memorization. Step through the 4-part interview response framework below.',
    expectedOutcome: 'Review all 4 answer stages and select the strongest prioritized first-response sequence.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'int-1-verify',
        label: '1. Validate & Enrich Alert',
        role: 'Avoid Knee-Jerk False Positives',
        summary: 'Check the destination IP reputation, process owner (Sysmon Event ID 1/3), DNS query history, and whether an authorized change ticket exists.',
        details: [
          'Distinguishes a CDN software update from an unsigned binary in Temp',
          'Shows interviewers you verify facts before disrupting production'
        ],
        securityRelevance: 'Demonstrates calm, evidence-driven Tier 1/2 SOC judgment.',
        sampleMetric: 'Step 1 · Triage'
      },
      {
        id: 'int-2-contain',
        label: '2. Contain Safely',
        role: 'Stop Spread Without Losing RAM',
        summary: 'Once confirmed True Positive, isolate the host via EDR, disable/revoke the affected user session, and block the C2 domain/IP at perimeter DNS/firewall.',
        details: [
          'Do NOT yank power immediately—you would wipe volatile RAM forensics',
          'Isolating preserves live investigation access while stopping beaconing'
        ],
        securityRelevance: 'Protects neighboring assets while preserving evidence.',
        sampleMetric: 'Step 2 · Containment'
      },
      {
        id: 'int-3-scope',
        label: '3. Scope & Eradicate',
        role: 'Check Sibling Hosts & Persistence',
        summary: 'Search SIEM across all endpoints for the same file hash or C2 IP, remove persistence (scheduled tasks/Run keys), and re-image or patch the root entry flaw.',
        details: [
          'Answers the key question: "Is only one machine affected, or five?"',
          'Forces credential resets for any exposed user tokens'
        ],
        securityRelevance: 'Prevents attackers from returning through unpatched sibling hosts.',
        sampleMetric: 'Step 3 · Scope & Clean'
      },
      {
        id: 'int-4-learn',
        label: '4. Document & Harden',
        role: 'Turn Incident Into Resilience',
        summary: 'Summarize timeline, root cause, and new detection/prevention rules (e.g., blocking unsigned scripts or adding MFA) in a post-incident review.',
        details: [
          'Shows awareness of NIST SP 800-61 Post-Incident Activity',
          'Signals readiness for collaborative engineering teams'
        ],
        securityRelevance: 'Completes the full professional lifecycle clearly in a 90-second interview answer.',
        sampleMetric: 'Step 4 · Lessons Learned'
      }
    ],
    challenge: {
      prompt: 'An interviewer asks: "You confirm a workstation is actively beaconing to a malicious C2 IP. Should you immediately pull the power plug, or isolate via EDR first?" What is the best answer?',
      options: [
        'Isolate via EDR (and block the C2 indicator at the firewall) first so spread stops immediately while preserving volatile memory and process artifacts for forensics.',
        'Pull the power plug right away so the motherboard wipes RAM.',
        'Email the suspected attacker asking them to disconnect.',
        'Delete the SIEM alert so the queue stays empty.'
      ],
      correctIndex: 0,
      hint: 'Remember what happens to volatile RAM evidence when power is cut vs. logical EDR network isolation.',
      explanation: 'Logical isolation via EDR halts lateral movement and external beaconing immediately while keeping the host alive in a safe state so responders can collect volatile memory, processes, and persistence artifacts.'
    }
  }
];
