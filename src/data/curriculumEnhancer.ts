import { Tier, Lesson } from '../types';
import {
  DomainGuideKey,
  EXPLICIT_LESSON_DOMAIN_MAP,
  LESSON_METADATA,
  TIER_METADATA,
  TOPIC_METADATA,
} from './curriculumMetadata';
import { buildQuestionFeedbackMetadata } from './curriculumAssessmentEnhancer';

// Precise homework configuration map for lessons that require terminal verification
const LESSON_TERMINALS: Record<string, { command: string; instruction: string; hint: string; regex: string }> = {
  'comp-hardware': {
    command: 'lscpu',
    instruction: 'Run `lscpu` or `lsblk` or `free -h` in your local machine\'s terminal to inspect your system hardware specifications.',
    hint: 'Ensure your pasted output contains CPU architecture fields (e.g., "Architecture:", "x86_64", "Model name:") or storage/memory indicators (e.g., "NAME  MAJ:MIN", "Mem:").',
    regex: 'architecture:|x86_64|model name:|vendor id:|cpu\\(s\\)|lsblk|name\\s+maj:min|sda\\d*|mem:\\s+\\d+|total\\s+used'
  },
  'boot-os': {
    command: 'df -hT',
    instruction: 'Execute `df -hT` (on Linux/macOS) or `Get-Volume` / `Get-CimInstance Win32_LogicalDisk` (in PowerShell on Windows) to view disk partition tables and space utilization.',
    hint: 'Output should display active filesystems, mount points, or Windows volume columns (e.g., "Filesystem ... Mounted on", "DriveLetter", "FileSystemLabel", "SizeRemaining").',
    regex: 'filesystem\\s+type|filesystem.*mounted on|driveletter|filesystemlabel|sizeremaining|win32_logicaldisk'
  },
  'net-osi-tcp': {
    command: 'ip addr show',
    instruction: 'Run connection topology adapter command `ip addr show` (on Linux) or `ifconfig` (macOS) or `ipconfig` (Windows) to print active link states.',
    hint: 'Pasted output must show link indicators, interfaces, or IP network configuration lines (e.g., "inet", "netmask", "ether", "IPv4 Address", "Subnet Mask").',
    regex: 'inet\\s+|netmask|ether|flags=|ipconfig|ipv4 address|ethernet adapter|wireless lan|subnet mask'
  },
  'ip-subnetting': {
    command: 'ipcalc 192.168.1.0/24',
    instruction: 'Calculate subnet footprints using `ipcalc 192.168.1.0/24` or analyze CIDR mask boundaries with local network utilities.',
    hint: 'Output should demonstrate subnet division specs, masks, or hosts counts (e.g., "Netmask:", "HostMin:", "HostMax:", "Broadcast:", "Hosts/Net:").',
    regex: 'netmask:|hostmin:|hostmax:|broadcast:|hosts/net:|network:\\s+\\d+\\.\\d+|\\b\\d+\\.\\d+\\.\\d+\\.\\d+/\\d+\\b.*netmask'
  },
  'infra-protocols': {
    command: 'dig google.com',
    instruction: 'Execute DNS lookup using `dig google.com` or `nslookup google.com` to inspect standard dynamic infrastructure records.',
    hint: 'Output must include valid query answer sections, server mappings, or DNS record lines (e.g., "ANSWER SECTION", "Non-authoritative answer:", "Server: ...", "IN A").',
    regex: 'answer section|non-authoritative answer|;;\\s*question section|server:\\s+\\S+|\\bin\\s+(?:a|aaaa|mx|ns)\\s+\\S+|address:\\s+\\d+\\.\\d+'
  },
  'transport-protocols': {
    command: 'ss -tuln',
    instruction: 'Scan active transport socket listings using `ss -tuln` (Linux) or `netstat -an` to identify local listening ports.',
    hint: 'Output must demonstrate socket states and endpoints (e.g., "LISTEN", "ESTABLISHED", "Local Address", "Foreign Address", "Netid  State").',
    regex: 'listen|established|local address|foreign address|netid\\s+state|(?:tcp|udp)\\s+\\d+'
  },
  'vpn-firewalls': {
    command: 'sudo nft list ruleset',
    instruction: 'Query firewall rulesets with `sudo nft list ruleset` or `sudo iptables -L -n` (Linux), or `netsh advfirewall show allprofiles` (Windows).',
    hint: 'Pasted logs must represent firewall tables, chains, or profile policies (e.g., "table inet", "Chain INPUT", "policy accept", "advfirewall", "Domain Profile Settings").',
    regex: 'table\\s+(?:inet|ip|ip6)\\s+|chain input|chain forward|chain output|firewall state|advfirewall|policy (?:accept|drop)|domain profile settings'
  },
  'lin-fs': {
    command: 'ls -la /etc',
    instruction: 'List file nodes inside the system configuration path by running `ls -la /etc`.',
    hint: 'Output must demonstrate Unix file permissions, files owner fields, or structural configurations (e.g., "passwd", "hosts", "resolv.conf", "drwxr-xr-x").',
    regex: 'passwd|hosts|resolv\\.conf|drwxr-xr-x|-rw-r--r--'
  },
  'lin-permissions': {
    command: 'ls -la',
    instruction: 'Audit file directories using access mask verification command `ls -la` to check owner blocks.',
    hint: 'Pasted text must demonstrate 10-character permissions blocks (e.g., "drwxr-xr-x", "-rw-rw-r--") or list "total" file counts.',
    regex: '[drwx-]{10}|total\\s+\\d+'
  },
  'bash-scripting': {
    command: 'bash --version',
    instruction: 'Run script engine version probe `bash --version` to identify your active Unix shell execution parameters.',
    hint: 'Output must report valid GNU Bash build identifiers (e.g., "GNU bash, version", "license GPLv3+").',
    regex: 'gnu bash|version \\d+\\.\\d+|gplv3'
  },
  'lin-logfiltering': {
    command: 'grep -i "error" /var/log/syslog',
    instruction: 'Search log files for anomalies by running `grep -i "error" /var/log/syslog` or `journalctl -p err -n 10`.',
    hint: 'Output should demonstrate syslog/journal timestamps, facility names, or log paths (e.g., "/var/log/syslog", "auth.log", "systemd[", "kernel:", "dmesg").',
    regex: '/var/log/(?:syslog|messages|auth\\.log)|\\bauth\\.log\\b|\\bsyslog\\b|\\bdmesg\\b|kernel:|systemd\\[|sshd\\[|error:\\s+\\S+'
  },
  'lin-services': {
    command: 'systemctl status cron',
    instruction: 'Query cron daemon run state by executing `systemctl status cron` or `service cron status` on your system.',
    hint: 'Output must represent standard service status properties (e.g., "Active: active", "Loaded:", "cron.service", "Main PID:").',
    regex: 'active:\\s+active|loaded:\\s+loaded|cron\\.service|main pid:|substate=|unit\\s+load\\s+active'
  },
  'lin-remote': {
    command: 'ssh -V',
    instruction: 'Identify secure shell version configurations by executing version probe `ssh -V`.',
    hint: 'Pasted output must show active SSH compiler versions (e.g., "OpenSSH_9.", "LibreSSL").',
    regex: 'openssh_|libressl|openssl\\s+\\d|ssh-\\d+\\.\\d+|usage:\\s+ssh'
  },
  'win-arch': {
    command: 'reg query "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion"',
    instruction: 'Query the core Windows Registry hives using `reg query "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion"` in PowerShell or CMD.',
    hint: 'Pasted logs must represent Windows build registry keys (e.g., "ProductName", "CurrentVersion", "BuildLab", "HKEY_LOCAL_MACHINE").',
    regex: 'productname|currentversion|buildlab|hkey_local_machine'
  },
  'win-shells': {
    command: 'Get-Process',
    instruction: 'Run active process diagnostic command `Get-Process` in PowerShell (or `tasklist` in classic Command Prompt).',
    hint: 'Output must list Windows system active process columns (e.g., "Handles  NPM(K)  PM(K)", "ProcessName", "svchost", "Image Name").',
    regex: 'handles\\s+npm|processname|svchost|tasklist|image name|pid\\s+session name'
  },
  'win-ad-logs': {
    command: 'Get-WinEvent -LogName System -MaxEvents 5',
    instruction: 'Audit active Windows Event Log streams by running `Get-WinEvent -LogName System -MaxEvents 5` in PowerShell.',
    hint: 'Logs must list modern Windows Event properties (e.g., "ProviderName:", "TimeCreated", "LevelDisplayName", "Message") or legacy EventLog fields ("EntryType ... InstanceID").',
    regex: 'providername|timecreated|leveldisplayname|recordid|logname:\\s*system|entrytype.*source.*instanceid'
  },
  'win-services-firewall': {
    command: 'sc query state= all',
    instruction: 'Query Windows services status list by running command `sc query state= all` (or `Get-Service` in PowerShell).',
    hint: 'Output should demonstrate Windows service state tables (e.g., "SERVICE_NAME:", "DISPLAY_NAME:", "STATE : 4 RUNNING", or "Status  Name  DisplayName").',
    regex: 'service_name:|display_name:|state\\s+:\\s+\\d+|status\\s+name\\s+displayname'
  },
  'docker-basics': {
    command: 'docker ps',
    instruction: 'Execute container listing command `docker ps` or inspect image inventories with `docker images`.',
    hint: 'Output must represent container runtime columns (e.g., "CONTAINER ID  IMAGE", "REPOSITORY  TAG", "IMAGE ID").',
    regex: 'container id\\s+image|repository\\s+tag|image id|created\\s+status'
  },
  'k8s-basics': {
    command: 'kubectl get pods',
    instruction: 'Retrieve cluster runtime node deployments by executing `kubectl get pods` or `kubectl version`.',
    hint: 'Output should list pod status table headers or version lines (e.g., "NAME  READY  STATUS", "Client Version:", "Server Version:").',
    regex: 'name\\s+ready\\s+status|restarts\\s+age|client version:|server version:|no resources found in .* namespace'
  },
  'git-workflows': {
    command: 'git status',
    instruction: 'Check local workspace git parameters by running `git status` or version state command `git log -n 1`.',
    hint: 'Output must represent active git working tree status (e.g., "On branch", "nothing to commit", "changes not staged", "commit <hash>").',
    regex: 'on branch\\s+\\S+|nothing to commit|changes not staged|untracked files|commit\\s+[a-f0-9]{7,40}|author:\\s+\\S+'
  },
  'py-basics': {
    command: 'python -V',
    instruction: 'Verify Python engine installation by executing version command `python -V` or `python3 --version`.',
    hint: 'Output must print active Python installation versions (e.g., "Python 3.12.1").',
    regex: 'python\\s+[23]\\.\\d+\\.\\d+'
  },
  'py-file-regex': {
    command: 'python -c "import re; print(re.search(\'\\\\d+\', \'Target 100\').group())"',
    instruction: 'Test regular expression compilers in Python by executing command `python -c "import re; print(re.search(\'\\d+\', \'Target 100\').group())"`.',
    hint: 'Pasted output must show parsed numeric match (e.g., "100").',
    regex: '^100$'
  },
  'py-automation': {
    command: 'python -c "import socket; print(\'host=\' + socket.gethostname())"',
    instruction: 'Examine Python socket network helper operations by executing `python -c "import socket; print(\'host=\' + socket.gethostname())"`.',
    hint: 'Pasted output must match the labeled hostname format (e.g., "host=workstation-01").',
    regex: '^host=[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$'
  },
  'endpoint-audit': {
    command: 'Get-Service',
    instruction: 'Identify security monitoring components by querying system services (on Windows run `Get-Service` or on Linux use `systemctl list-units`).',
    hint: 'Pasted text must list system service table headers or Sysmon service records (e.g., "Status  Name  DisplayName", "Sysmon", "UNIT  LOAD  ACTIVE  SUB").',
    regex: 'status\\s+name\\s+displayname|sysmon(?:64)?|unit\\s+load\\s+active|active\\s+sub'
  },
  'network-defense': {
    command: 'tcpdump -D',
    instruction: 'Identify active packet capture interfaces by executing `tcpdump -D` or `tshark -D`.',
    hint: 'Pasted logs must represent packet sniffer interfaces (e.g., "1.eth0", "2.lo", "listening on", "capturing on").',
    regex: '\\d+\\.\\S+\\s*\\[|\\d+\\.[a-z0-9_.-]+.*\\(|capturing on|listening on|tcpdump version'
  },
  'dig-forensics': {
    command: 'vol -h',
    instruction: 'Verify your Volatility 3 forensics tooling availability by running help command `vol -h` (or legacy `volatility -h`).',
    hint: 'Pasted output must represent Volatility CLI help output (e.g., "Volatility 3 Framework", "usage: vol", "Volatility Foundation", "options: -h").',
    regex: 'volatility\\s+3|volatility foundation|usage:\\s+vol|options:\\s+-h|windows\\.pslist'
  },
  'active-recon': {
    command: 'nmap -sV 10.10.10.10',
    instruction: 'Probe service versions using Port scanner `nmap -sV 10.10.10.10` (or running equivalent local nmap checks).',
    hint: 'Logs must demonstrate active Nmap scanning parameters (e.g., "Nmap scan report for", "PORT STATE SERVICE VERSION").',
    regex: 'nmap scan report|port\\s+state\\s+service\\s+version|\\d+/tcp\\s+open'
  },
  'net-infiltration': {
    command: 'msfconsole -v',
    instruction: 'Initialize Metasploit penetration testing engine version parameters by running `msfconsole -v`.',
    hint: 'Output must confirm Metasploit Framework version strings (e.g., "Framework Version:", "Metasploit Framework").',
    regex: 'framework version:|metasploit\\s+framework|framework:\\s+\\d+\\.'
  },
  'password-attacks': {
    command: 'john --list=formats',
    instruction: 'Probe supported hashing algorithms inside password cracker tool by running `john --list=formats` or `hashcat --help`.',
    hint: 'Pasted logs must describe cryptographic hashing formats (e.g., "sha512crypt", "bcrypt", "md5crypt", "John the Ripper", "hashcat (").',
    regex: 'sha512crypt|bcrypt|md5crypt|descrypt|john the ripper|hashcat\\s+\\(|--format='
  },
  'priv-esc': {
    command: 'sudo -l',
    instruction: 'Audit administrator privilege delegation scopes by executing privilege list command `sudo -l`.',
    hint: 'Logs must represent user sudo allowances (e.g., "User may run the following commands", "(ALL : ALL)", "NOPASSWD").',
    regex: 'user may run|\\(all\\s+:\\s+all\\)|nopasswd|\\(root\\)'
  }
};

/**
 * Deterministic lessonId -> domain guide lookup.
 * Returns null for unknown lesson IDs so arbitrary fallback material is never injected.
 */
export function getExplicitDomainKey(lessonId: string): DomainGuideKey | null {
  return EXPLICIT_LESSON_DOMAIN_MAP[lessonId] || null;
}

function extractObjectivesFromContent(content: string): string[] {
  const match = content.match(/####\s*Learning Objectives\s*\n([\s\S]*?)(?=\n#{2,4}\s|\n---|$)/i);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean);
}

function parseMinutesFromDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : 15;
}

export function enhanceCurriculum(tiers: Tier[]): Tier[] {
  return tiers.map((tier, tierIdx) => {
    const tierMeta = TIER_METADATA[tier.id];
    return {
      ...tier,
      order: tierMeta?.order ?? tier.order ?? tierIdx + 1,
      defaultRequired: tierMeta?.defaultRequired ?? tier.defaultRequired ?? true,
      topics: tier.topics.map((topic, topicIdx) => {
        const topicMeta = TOPIC_METADATA[topic.id];
        return {
          ...topic,
          order: topicMeta?.order ?? topic.order ?? topicIdx + 1,
          tierId: topicMeta?.tierId ?? topic.tierId ?? tier.id,
          lessons: topic.lessons.map((lesson, lessonIdx) => {
            const lessonMeta = LESSON_METADATA[lesson.id];
            const cleanContent = lesson.content.replace(/\n{3,}/g, '\n\n').trim();

            // Attach optional terminal verification homework metadata where configured
            const terminalConfig = LESSON_TERMINALS[lesson.id];
            const parsedObjectives =
              lesson.learningObjectives && lesson.learningObjectives.length > 0
                ? lesson.learningObjectives
                : extractObjectivesFromContent(cleanContent);

            return {
              ...lesson,
              content: cleanContent,
              quiz: (lesson.quiz || []).map((q) => ({
                ...q,
                ...buildQuestionFeedbackMetadata(q, cleanContent),
              })),
              requiresTerminal: lesson.requiresTerminal ?? !!terminalConfig,
              homeworkCommand: lesson.homeworkCommand ?? terminalConfig?.command,
              homeworkInstruction: lesson.homeworkInstruction ?? terminalConfig?.instruction,
              homeworkHint: lesson.homeworkHint ?? terminalConfig?.hint,
              homeworkValidateRegex: lesson.homeworkValidateRegex ?? terminalConfig?.regex,
              order: lessonMeta?.order ?? lesson.order ?? lessonIdx + 1,
              tierId: lessonMeta?.tierId ?? lesson.tierId ?? tier.id,
              topicId: lessonMeta?.topicId ?? lesson.topicId ?? topic.id,
              difficulty: lessonMeta?.difficulty ?? lesson.difficulty ?? 'beginner',
              estimatedMinutes:
                lessonMeta?.estimatedMinutes ??
                lesson.estimatedMinutes ??
                parseMinutesFromDuration(lesson.duration),
              learningObjectives: parsedObjectives,
              prerequisites: lessonMeta?.prerequisites ?? lesson.prerequisites ?? [],
              recommendedPrerequisites:
                lessonMeta?.recommendedPrerequisites ?? lesson.recommendedPrerequisites ?? [],
              required: lessonMeta?.required ?? lesson.required ?? true,
              completionRequirements: lessonMeta?.completionRequirements ??
                lesson.completionRequirements ?? {
                  requireQuiz: true,
                  requirePracticalLab: false,
                  requireHomework: false,
                  minQuizScorePercent: 100,
                },
            };
          }),
        };
      }),
    };
  });
}
