import { Tier } from '../../types';

export const tier8: Tier = {
  id: 'tier-8',
  number: 8,
  title: 'Governance, Risk & Compliance',
  description: 'Learn cyber security framework architectures, study industry regulations, and prepare for audits.',
  topics: [
    {
      id: 'grc-frameworks',
      title: 'GRC Frameworks & Standards',
      category: 'grc',
      lessons: [
        {
          id: 'infosec-frameworks',
          title: 'Information Security Frameworks',
          description: 'Harness cyber frameworks including ISO 27001, SOC 2, NIST CSF, and CIS Controls.',
          duration: '15 mins',
          content: `### Information Security Frameworks

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Map requirements across security frameworks (ISO 27001, SOC 2, NIST CSF).
- Audit environments using CIS Controls guidelines.
- Build continuous compliance programs.

#### Key Concepts
- **NIST CSF (Cybersecurity Framework):** Voluntarily adopted risk management framework structured into five core functions: Identify, Protect, Detect, Respond, Recover.
- **ISO 27001:** International standard detailing specifications for an Information Security Management System (ISMS).
- **SOC 2 (System and Organization Controls):** Audit framework evaluating service organizations across Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy).
- **CIS Controls:** A prioritized set of action-oriented security practices designed to mitigate common cyber attacks.

#### Detailed Lesson Content
Security programs require structured management. **Governance, Risk, and Compliance (GRC)** frameworks provide organizations with structured paths to manage risk, secure data, and achieve compliance.
- **NIST CSF** is widely used in the US, organizing security activities into core functions (Identify, Protect, Detect, Respond, Recover).
- **ISO 27001** is a globally recognized standard that requires implementing a formal Information Security Management System (ISMS), supported by Annex A controls.
- **SOC 2** audits evaluate service providers across the Trust Services Criteria, ensuring customer data is protected.
- **CIS Controls** provide a prioritized list of practical, action-oriented safeguards to mitigate common threats.`,
          quiz: [
            {
              id: 'q-grc-1',
              question: 'Which NIST CSF function is focused on developing and implementing appropriate activities to take action regarding a detected security event?',
              options: [
                'Identify',
                'Protect',
                'Detect',
                'Respond'
              ],
              correctOption: 3,
              explanation: 'The "Respond" function is dedicated to containment, mitigation, and communications following a security event.'
            },
            {
              id: 'q-grc-2',
              question: 'Which framework establishes international specifications for building and maintaining an Information Security Management System (ISMS)?',
              options: [
                'SOC 2',
                'ISO 27001',
                'PCI-DSS',
                'HIPAA'
              ],
              correctOption: 1,
              explanation: 'ISO 27001 is the global standard defining the requirements for establishing and operating an ISMS.'
            },
            {
              id: 'q-grc-3',
              question: 'Which SOC 2 trust criteria is mandatory for every SOC 2 audit report?',
              options: [
                'Availability',
                'Processing Integrity',
                'Security (Common Criteria)',
                'Privacy'
              ],
              correctOption: 2,
              explanation: 'The Security criteria is the baseline required for all SOC 2 audits, with other criteria being optional based on scope.'
            },
            {
              id: 'q-grc-4',
              question: 'What is the primary benefit of mapping security controls against a prioritized list like the CIS Controls?',
              options: [
                'It guarantees immunity from ransomware.',
                'It provides a prioritized, actionable roadmap to mitigate the most common cyber threats.',
                'It automates code deployments.',
                'It replaces the need for a security team.'
              ],
              correctOption: 1,
              explanation: 'The CIS Controls provide a prioritized list of action-oriented safeguards designed to address the most common and damaging cyber threats.'
            }
          ]
        },
        {
          id: 'compliance-standards',
          title: 'Regulatory Compliance Standards',
          description: 'Harden environments to comply with GDPR, CCPA, HIPAA, and PCI-DSS regulations.',
          duration: '15 mins',
          content: `### Regulatory Compliance Standards

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Information Security Frameworks  

#### Learning Objectives
- Identify key requirements of global data protection regulations.
- Enforce healthcare data boundaries under HIPAA.
- Implement cardholder data security controls for PCI-DSS compliance.

#### Key Concepts
- **GDPR (General Data Protection Regulation):** EU regulation governing data privacy and protection, establishing rights like the "right to be forgotten."
- **CCPA (California Consumer Privacy Act):** US state-level privacy law granting consumers control over their personal data.
- **HIPAA:** US law protecting the privacy and security of Protected Health Information (PHI).
- **PCI-DSS:** Security standards designed to protect cardholder data and secure credit card transactions.

#### Detailed Lesson Content
Compliance is a powerful driver for enterprise security. Organizations must adapt to a complex web of regional and industry-specific regulations:
- **GDPR** and **CCPA** protect consumer privacy, granting individuals control over how their personal data is collected, stored, and processed, with failure to comply risking severe fines.
- **HIPAA** requires organizations to protect medical records (Protected Health Information - PHI) through strict administrative, physical, and technical safeguards.
- **PCI-DSS** governs credit card transactions, requiring cardholder data environments (CDE) to be isolated, encrypted, and monitored with regular security audits.`,
          quiz: [
            {
              id: 'q-reg-1',
              question: 'Which regulation grants EU citizens the "Right to Erasure" (Right to be Forgotten), requiring companies to delete their personal data upon request?',
              options: [
                'HIPAA',
                'PCI-DSS',
                'GDPR',
                'SOC 2'
              ],
              correctOption: 2,
              explanation: 'The General Data Protection Regulation (GDPR) establishes strict personal privacy rights, including the right to erasure.'
            },
            {
              id: 'q-reg-2',
              question: 'What type of sensitive data is protected under the United States HIPAA regulation?',
              options: [
                'Credit Card Numbers',
                'Protected Health Information (PHI)',
                'Driver\'s License Numbers',
                'Corporate Patent Records'
              ],
              correctOption: 1,
              explanation: 'HIPAA mandates safeguards to secure Protected Health Information (PHI) handled by healthcare entities and business associates.'
            },
            {
              id: 'q-reg-3',
              question: 'Which compliance standard is mandatory for any organization that stores, processes, or transmits credit card transactions?',
              options: [
                'ISO 27001',
                'PCI-DSS',
                'NIST SP 800-53',
                'GDPR'
              ],
              correctOption: 1,
              explanation: 'PCI-DSS (Payment Card Industry Data Security Standard) defines strict security controls required to handle cardholder transaction data safely.'
            },
            {
              id: 'q-reg-4',
              question: 'What is a common technical control required across both HIPAA and PCI-DSS to secure sensitive data in transit?',
              options: [
                'Strong Encryption (using TLS/SSL)',
                'Disabling all system firewall logs',
                'Using default router passwords',
                'Bypassing multi-factor authentication'
              ],
              correctOption: 0,
              explanation: 'Encrypting data in transit using modern TLS is a baseline requirement across security regulations to prevent interception.'
            }
          ]
        }
      ]
    }
  ]
};

export const tier9: Tier = {
  id: 'tier-9',
  number: 9,
  title: 'Capture The Flag',
  description: 'Accelerate offensive and defensive skills by exploring standard Capture the Flag (CTF) challenges.',
  topics: [
    {
      id: 'ctf-strategies',
      title: 'CTF Strategies & Training',
      category: 'offense',
      lessons: [
        {
          id: 'ctf-formats',
          title: 'CTF Competitions & Formats',
          description: 'Compare Jeopardy-style and Attack-Defense CTF game mechanics.',
          duration: '15 mins',
          content: `### CTF Competitions & Formats

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Differentiate between Jeopardy-style and Attack-Defense CTF structures.
- Map CTF challenge categories to real-world roles.
- Use structured approaches to search for hidden flags.

#### Key Concepts
- **Capture The Flag (CTF):** Educational cybersecurity competitions designed to test technical skills through hands-on challenges.
- **Jeopardy-Style:** Team-based competition where players solve distinct tasks across categories for point rewards.
- **Attack-Defense:** Immersive competition where teams defend their own services while hacking into competitors\' infrastructures.
- **Flag:** A unique string (e.g., \`FLAG{s3cur1ty_m4st3r}\`) submitted to a portal to prove challenge completion.

#### Detailed Lesson Content
**Capture The Flag (CTF)** competitions are highly effective training grounds for cybersecurity professionals:
- **Jeopardy-Style CTFs** feature a dashboard of independent challenges of varying difficulties. Categories typically include Web Exploitation, Cryptography, Reverse Engineering, Forensics, and Binary Exploitation.
- **Attack-Defense CTFs** simulate real-world operations: each team manages an identical server hosting vulnerable services. Teams must analyze their systems, patch vulnerabilities to secure their services, and exploit those same vulnerabilities in opponents\' systems to capture flags and score points.`,
          quiz: [
            {
              id: 'q-ctf-1',
              question: 'In which CTF format do teams simultaneously defend their own vulnerable services while attacking other teams\' systems?',
              options: [
                'Jeopardy-style',
                'Attack-Defense',
                'Boot-to-Root',
                'Hacker Jeopardy'
              ],
              correctOption: 1,
              explanation: 'Attack-Defense CTFs involve real-time offensive and defensive operations, requiring teams to patch their own systems while attacking opponents.'
            },
            {
              id: 'q-ctf-2',
              question: 'What is a "flag" in the context of a cybersecurity CTF competition?',
              options: [
                'A physical marker placed on a server.',
                'A unique text string hidden in a system that players must retrieve and submit to prove they completed a challenge.',
                'A configuration file that disables firewalls.',
                'A program used to scan ports.'
              ],
              correctOption: 1,
              explanation: 'Flags are unique tokens (e.g., in formats like flag{...}) placed on systems, inside files, or in database records to confirm successful exploitation or analysis.'
            },
            {
              id: 'q-ctf-3',
              question: 'Which of the following describes a Jeopardy-style CTF competition?',
              options: [
                'Players compete in a live trivia show.',
                'Teams solve a board of independent, themed challenges across multiple categories for varying points.',
                'A physical race to configure routers.',
                'A coding marathon to write applications.'
              ],
              correctOption: 1,
              explanation: 'Jeopardy-style CTFs feature a grid of challenges categorized by topic and difficulty, where players score points by solving individual tasks.'
            },
            {
              id: 'q-ctf-4',
              question: 'How do CTF challenges translate to professional development?',
              options: [
                'They replace university degrees completely.',
                'They provide hands-on experience with real-world exploitation, analysis, and defense tools in a safe, legal environment.',
                'They grant automatic security clearances.',
                'They are purely recreational and have no professional value.'
              ],
              correctOption: 1,
              explanation: 'CTFs provide practical, hands-on experience with advanced offensive and defensive techniques, helping develop critical problem-solving skills.'
            }
          ]
        },
        {
          id: 'ctf-skills',
          title: 'Core CTF Skills & Categories',
          description: 'Master core CTF categories, including binary exploitation, web hacking, and digital forensics.',
          duration: '18 mins',
          content: `### Core CTF Skills & Categories

**Difficulty:** Hard  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** CTF Competitions & Formats  

#### Learning Objectives
- Navigate common CTF categories (Binary Exploitation, Web, Forensics).
- Trace file artifacts to locate hidden flags.
- Identify common CTF platforms for ongoing training.

#### Key Concepts
- **Binary Exploitation (Pwn):** Exploiting software bugs (such as buffer overflows) to gain shell access or control program execution.
- **Web Exploitation:** Finding and exploiting web vulnerabilities like SQL injection, XSS, and directory traversal.
- **Forensics:** Analyzing network PCAPs, memory dumps, and file metadata to recover hidden data.
- **Crypto:** Cracking weak custom encryption schemes or identifying cryptographic implementation flaws.

#### Detailed Lesson Content
Succeeding in CTF competitions requires specialized skills across key categories:
- **Binary Exploitation (Pwn)** involves analyzing compiled programs (often without source code) to locate memory corruption bugs, exploit the stack or heap, and execute shellcode.
- **Web Exploitation** challenges test your ability to compromise web portals, bypass authentication, and run remote commands.
- **Digital Forensics** focuses on investigation: analyzing system logs, packet captures (PCAP), and memory dumps to recover deleted files, identify malicious traffic, and find hidden flags.
- To practice, players use community training platforms like **Hack The Box** and **TryHackMe**.`,
          quiz: [
            {
              id: 'q-ctfs-1',
              question: 'Which CTF challenge category focuses on exploiting memory corruption bugs, buffer overflows, and format string vulnerabilities in compiled binaries?',
              options: [
                'Cryptography',
                'Binary Exploitation (Pwn)',
                'Open Source Intelligence (OSINT)',
                'Digital Forensics'
              ],
              correctOption: 1,
              explanation: 'Binary Exploitation (Pwn) challenges require analyzing compiled executables to find and exploit memory management flaws.'
            },
            {
              id: 'q-ctfs-2',
              question: 'In a Web CTF challenge, you locate an endpoint that retrieves local files: "/view?file=../../../../etc/passwd". What is this vulnerability called?',
              options: [
                'Cross-Site Scripting (XSS)',
                'Directory Traversal / Local File Inclusion (LFI)',
                'SQL Injection',
                'Command Injection'
              ],
              correctOption: 1,
              explanation: 'Directory Traversal uses parent directory relative paths (../) to access files outside the web root, which can expose sensitive system files.'
            },
            {
              id: 'q-ctfs-3',
              question: 'Which CTF category focuses on analyzing file metadata, extracting payloads from PCAP logs, and investigating disk images?',
              options: [
                'Reverse Engineering',
                'Digital Forensics',
                'Cryptography',
                'Web Exploitation'
              ],
              correctOption: 1,
              explanation: 'Forensics challenges require players to investigate system artifacts and logs to reconstruct activities and locate hidden flags.'
            },
            {
              id: 'q-ctfs-4',
              question: 'Which popular training platform features interactive "rooms" and guided paths to practice cybersecurity and CTF skills legally?',
              options: [
                'TryHackMe',
                'VirusTotal',
                'Shodan',
                'ExploitDB'
              ],
              correctOption: 0,
              explanation: 'TryHackMe and Hack The Box are leading platforms that provide legal, hands-on environments to learn and practice cybersecurity skills.'
            }
          ]
        }
      ]
    }
  ]
};

export const tier10: Tier = {
  id: 'tier-10',
  number: 10,
  title: 'Certifications',
  description: 'Evaluate industry security certifications and plan your professional development path.',
  topics: [
    {
      id: 'cert-pathways',
      title: 'Cyber Certification Pathways',
      category: 'foundations',
      lessons: [
        {
          id: 'entry-certs',
          title: 'Entry-Level Certifications',
          description: 'Assess foundational security certifications, including Security+, Network+, and eJPT.',
          duration: '15 mins',
          content: `### Entry-Level Certifications

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Map requirements across foundational certifications.
- Build a structured study plan for CompTIA Security+.
- Contrast theory-based and hands-on practical exams.

#### Key Concepts
- **CompTIA Security+:** Globally recognized foundational certification validating core cybersecurity knowledge.
- **CompTIA Network+ / Cisco CCNA:** Certifications validating foundational networking skills.
- **eJPT (eLearnSecurity Junior Penetration Tester):** Hands-on entry-level penetration testing certification focusing on practical network assessment.

#### Detailed Lesson Content
Certifications are highly valued by employers as validation of technical knowledge.
- For beginners, **CompTIA Security+** is the industry-standard entry-level credential. It validates foundational knowledge of network security, threat vectors, risk management, and compliance.
- Networking is critical to security. Certifications like **CompTIA Network+** or **Cisco CCNA** build a deep understanding of IP routing, switching, and network architectures.
- If you are pursuing an offensive path, the **eJPT** is a practical certification where you perform actual host exploitation and network enumeration in a live lab environment, providing hands-on validation of basic pentesting skills.`,
          quiz: [
            {
              id: 'q-cer-1',
              question: 'Which certification is widely considered the industry-standard baseline credential for entering the cybersecurity field?',
              options: [
                'OSCP',
                'CompTIA Security+',
                'CISSP',
                'CEH'
              ],
              correctOption: 1,
              explanation: 'CompTIA Security+ is globally recognized as the foundational entry-level certification validating core cybersecurity concepts.'
            },
            {
              id: 'q-cer-2',
              question: 'What is a key difference between the eJPT exam and the CompTIA Security+ exam?',
              options: [
                'Security+ is a coding exam; eJPT is not.',
                'eJPT is a hands-on, practical penetration testing exam; Security+ is a theory-based multiple-choice exam.',
                'Security+ requires five years of professional experience.',
                'eJPT is only for executive managers.'
              ],
              correctOption: 1,
              explanation: 'The eJPT is a practical exam testing hands-on network exploitation skills, whereas Security+ focuses on general security concepts through multiple-choice questions.'
            },
            {
              id: 'q-cer-3',
              question: 'Which Cisco certification validates foundational networking skills, IP routing, subnetting, and device configuration?',
              options: [
                'CCNA',
                'Network+',
                'eJPT',
                'CEH'
              ],
              correctOption: 0,
              explanation: 'The Cisco Certified Network Associate (CCNA) is a highly respected credential validating routing and switching fundamentals.'
            },
            {
              id: 'q-cer-4',
              question: 'Why should entry-level security professionals prioritize learning networking fundamentals?',
              options: [
                'Networking is a minor part of security.',
                'You cannot secure or attack a system unless you understand how data is packaged, routed, and transmitted across networks.',
                'Networking certifications are mandatory for all jobs.',
                'Networking is only relevant for system administrators.'
              ],
              correctOption: 1,
              explanation: 'Understanding network protocols (like TCP, DNS, and routing) is essential for analyzing traffic, detecting anomalies, and conducting security assessments.'
            }
          ]
        },
        {
          id: 'advanced-certs',
          title: 'Advanced & Professional Certifications',
          description: 'Assess advanced certification pathways, including CEH, OSCP, and CISSP.',
          duration: '15 mins',
          content: `### Advanced & Professional Certifications

**Difficulty:** Hard  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Entry-Level Certifications  

#### Learning Objectives
- Assess professional-level certifications (OSCP, CEH, CISSP).
- Evaluate experience and domain requirements for the CISSP.
- Plan study paths for advanced security certifications.

#### Key Concepts
- **OSCP (Offensive Security Certified Professional):** Highly respected, hands-on certification requiring candidates to compromise lab machines within a 24-hour window.
- **CEH (Certified Ethical Hacker):** Broad certification validating general knowledge of offensive concepts and techniques.
- **CISSP (Certified Information Systems Security Professional):** Globally recognized certification validating advanced leadership, engineering, and administrative skills, requiring five years of professional experience.

#### Detailed Lesson Content
As you progress in your career, advanced certifications can help unlock higher-level engineering and management roles:
- **CEH** validates general ethical hacking concepts and threat methodologies, utilizing multiple-choice examinations.
- **OSCP** is the industry standard for penetration testing roles. It is a grueling, 24-hour practical exam where candidates must actively exploit vulnerable lab servers, write exploits, escalate privileges, and submit a professional report.
- For leadership and architectural roles, **CISSP** is highly sought after. Candidates are evaluated across eight domains of security, and must possess five years of professional, verified experience to fully earn the credential.`,
          quiz: [
            {
              id: 'q-acer-1',
              question: 'Which certification requires candidates to compromise target lab machines and submit a professional penetration testing report within a strict 24-hour window?',
              options: [
                'CISSP',
                'CompTIA Security+',
                'CEH',
                'OSCP'
              ],
              correctOption: 3,
              explanation: 'The OSCP (Offensive Security Certified Professional) is a practical, hands-on certification validating penetration testing skills.'
            },
            {
              id: 'q-acer-2',
              question: 'How many years of professional cybersecurity experience are required to fully earn the CISSP credential?',
              options: [
                'No experience required',
                '1 year',
                '3 years',
                '5 years'
              ],
              correctOption: 3,
              explanation: 'The CISSP requires a minimum of five years of cumulative, paid work experience across two or more of its eight domains.'
            },
            {
              id: 'q-acer-3',
              question: 'Which certification focuses heavily on high-level administrative concepts, risk management, asset security, and engineering leadership?',
              options: [
                'OSCP',
                'eJPT',
                'CISSP',
                'CCNA'
              ],
              correctOption: 2,
              explanation: 'The CISSP is designed for experienced security professionals, validating skills in security leadership, architecture, and governance.'
            },
            {
              id: 'q-acer-4',
              question: 'What is a major benefit of obtaining practical, hands-on certifications (like eJPT or OSCP) over multiple-choice security certifications?',
              options: [
                'Practical certifications require no studying.',
                'Practical certifications prove to employers that you can apply your knowledge and perform technical tasks in real-world environments.',
                'Practical certifications are easier to pass.',
                'Practical certifications are cheaper.'
              ],
              correctOption: 1,
              explanation: 'Practical exams test hands-on application of skills in simulated environments, demonstrating actual capability to employers.'
            }
          ]
        }
      ]
    }
  ]
};

export const tier11: Tier = {
  id: 'tier-11',
  number: 11,
  title: 'Career Preparation',
  description: 'Design a professional portfolio, write an effective cybersecurity resume, and prepare for technical interviews.',
  topics: [
    {
      id: 'career-landing',
      title: 'Cybersecurity Careers & Landing Roles',
      category: 'foundations',
      lessons: [
        {
          id: 'portfolio-resumes',
          title: 'Portfolio Building & Resumes',
          description: 'Construct cybersecurity resumes and build professional portfolios showcasing hands-on projects.',
          duration: '15 mins',
          content: `### Portfolio Building & Resumes

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Design a professional portfolio website to showcase hands-on projects.
- Write a resume optimized for applicant tracking systems (ATS).
- Document and publish home lab projects on GitHub.

#### Key Concepts
- **Portfolio:** A central website or repository showcasing your projects, writeups, home labs, and credentials.
- **ATS-Optimized Resume:** Resumes formatted specifically to pass automated applicant tracking systems (using clear hierarchies, clean fonts, and relevant keywords).
- **Home Lab Projects:** Hands-on projects (e.g., configuring a local AD forest, deploying a SIEM, writing tools) that demonstrate practical skills.

#### Detailed Lesson Content
In cybersecurity, demonstrating practical capability is essential. Building a professional portfolio allows you to showcase hands-on skills directly to hiring managers:
- Create **Home Labs** (e.g., setting up a local Active Directory domain, deploying a SIEM, or building security automation scripts).
- Document your labs thoroughly and publish your work on **GitHub** or a personal blog.
- Your resume should be **ATS-optimized**: use a clean layout, clear section headings, standard fonts, and integrate relevant keywords from job descriptions to ensure it passes automated filters.`,
          quiz: [
            {
              id: 'q-car-1',
              question: 'Why is documenting and publishing home lab projects on GitHub or a blog beneficial for job seekers?',
              options: [
                'It is a mandatory requirement for all certifications.',
                'It demonstrates initiative and practical hands-on capability to hiring managers, providing evidence of your skills.',
                'It guarantees an immediate job offer.',
                'It replaces the need for a resume.'
              ],
              correctOption: 1,
              explanation: 'Documenting projects (like SIEM setups or scripts) proves you can configure and use security tools, demonstrating practical skills to potential employers.'
            },
            {
              id: 'q-car-2',
              question: 'What is a key practice for making a cybersecurity resume ATS-optimized?',
              options: [
                'Using multi-colored graphics and complex tables.',
                'Using standard fonts, clear headings, and incorporating keywords directly from the target job description.',
                'Saving the resume as an image file.',
                'Leaving out contact details for privacy.'
              ],
              correctOption: 1,
              explanation: 'Applicant Tracking Systems parse text-based formats best. Clear headings, simple layouts, and relevant keywords ensure the system successfully processes your resume.'
            },
            {
              id: 'q-car-3',
              question: 'Which home lab project would best demonstrate practical defense skills to a hiring manager for a SOC Analyst role?',
              options: [
                'Configuring a local Active Directory forest.',
                'Setting up a local SIEM (like Splunk or Elastic), ingesting host logs, and building correlation alerts.',
                'Designing a company website.',
                'Writing a video game.'
              ],
              correctOption: 1,
              explanation: 'Deploying and using a SIEM directly models the day-to-day responsibilities of a SOC Analyst, proving you are familiar with essential detection tools.'
            },
            {
              id: 'q-car-4',
              question: 'What should be the main focus of a project writeup in a professional cybersecurity portfolio?',
              options: [
                'A brief summary of what the project did.',
                'A detailed breakdown of the problem, the tools and technologies used, the step-by-step implementation, and what you learned.',
                'An explanation of the project cost.',
                'A list of team members.'
              ],
              correctOption: 1,
              explanation: 'A comprehensive project writeup explains your technical process, problem-solving approach, and tool proficiency, demonstrating your capabilities.'
            }
          ]
        },
        {
          id: 'interviews-networks',
          title: 'Interview Prep & Networking',
          description: 'Prepare for technical interview questions and build professional connections in the security community.',
          duration: '15 mins',
          content: `### Interview Prep & Networking

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Portfolio Building & Resumes  

#### Learning Objectives
- Prepare answers for standard technical and behavioral interview questions.
- Build connections within local and global cybersecurity communities.
- Plan a continuing education path to keep your skills current.

#### Key Concepts
- **Technical Interviews:** Interviews testing core knowledge (e.g., explaining the TCP handshake, DNS, port designations, or threat scenarios).
- **Networking:** Building professional relationships within local (e.g., BSides, OWASP) and online (e.g., LinkedIn, Discord) security communities.
- **Continuing Education:** Committing to ongoing learning through CTFs, reading blogs, and tracking threat intelligence to stay current.

#### Detailed Lesson Content
Landing your first role requires preparing for interviews and building connections in the field:
- **Technical Interviews** will test your understanding of core concepts: be prepared to explain fundamental topics (such as the OSI model, DNS, common ports, standard attack vectors, and defense strategies).
- **Community Networking** is highly valuable: attend local meetups (like **OWASP** or **Security BSides** chapters) and engage in online forums. Many roles are filled through networking before they are publicly listed.
- Cybersecurity is a rapidly evolving field. Commit to **Continuing Education**: follow threat intelligence blogs, participate in CTFs, and track new vulnerabilities to keep your skills sharp.`,
          quiz: [
            {
              id: 'q-int-1',
              question: 'Which of the following is a classic technical interview question designed to test your understanding of network protocols?',
              options: [
                'Explain how to install a CPU.',
                'Explain the steps of the TCP 3-Way Handshake.',
                'Describe how to write a website stylesheet.',
                'Define database relational join queries.'
              ],
              correctOption: 1,
              explanation: 'Explaining the TCP handshake (SYN, SYN/ACK, ACK) is a standard interview question that tests your core understanding of networking protocols.'
            },
            {
              id: 'q-int-2',
              question: 'Which local cybersecurity community chapter provides free meetups, presentations, and networking opportunities for security professionals?',
              options: [
                'ISO Group',
                'OWASP (Open Web Application Security Project) or BSides',
                'NIST Committee',
                'PCI Board'
              ],
              correctOption: 1,
              explanation: 'Local OWASP and Security BSides chapters are excellent, inclusive communities for connecting with peers, sharing knowledge, and learning about job opportunities.'
            },
            {
              id: 'q-int-3',
              question: 'Why is active continuous learning critical to long-term success in a cybersecurity career?',
              options: [
                'It is required to keep all certifications active.',
                'Threat actors and technologies evolve rapidly; you must continuously update your skills to defend against modern attack vectors.',
                'Continuous learning is mandatory for maintaining a security clearance.',
                'Without it, systems will stop running.'
              ],
              correctOption: 1,
              explanation: 'The threat landscape changes continuously, with new vulnerabilities and attack methods emerging daily, requiring ongoing learning to remain effective.'
            },
            {
              id: 'q-int-4',
              question: 'If an interviewer asks how you would handle a security incident where a system is actively beaconing to a malicious IP, which phase of incident response should you prioritize?',
              options: [
                'Eradication (deleting folders)',
                'Containment (isolating the host from the network)',
                'Preparation (writing a new policy)',
                'Reporting (emailing the CEO)'
              ],
              correctOption: 1,
              explanation: 'You should prioritize immediate Containment (like network isolation) to stop active traffic and prevent potential lateral spread before proceeding with eradication.'
            }
          ]
        }
      ]
    }
  ]
};
