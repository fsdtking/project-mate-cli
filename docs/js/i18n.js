const translations = {
    en: {
        features: 'Features',
        installation: 'Installation',
        usage: 'Usage',
        heroTitle: 'Project Mate CLI',
        heroSubtitle: 'Efficient Project Management Command Line Tool',
        coreFeatures: 'Core Features',
        quickInit: 'Quick Project Init',
        quickInitDesc: 'Create standardized project structure with one click',
        depManagement: 'Dependency Management',
        depManagementDesc: 'Smart dependency management, auto-resolve version conflicts',
        gitAutomation: 'Git Automation',
        gitAutomationDesc: 'Simplify Git workflow, improve team collaboration',
        configManagement: 'Config Management',
        configManagementDesc: 'Flexible project configuration, support multi-environment deployment',
        installGuide: 'Installation Guide',
        usageGuide: 'Usage Guide',
        initProject: 'Initialize new project',
        manageConfig: 'Manage configuration',
        gitHelper: 'Git operation helper',
        madeWith: 'Made with ❤️ by Project Mate Team'
    },
    zh: {
        features: '特性',
        installation: '安装',
        usage: '使用',
        heroTitle: 'Project Mate CLI',
        heroSubtitle: '高效的项目管理命令行工具',
        coreFeatures: '核心特性',
        quickInit: '快速项目初始化',
        quickInitDesc: '一键创建标准化的项目结构，快速开始开发',
        depManagement: '依赖管理',
        depManagementDesc: '智能管理项目依赖，自动处理版本冲突',
        gitAutomation: 'Git 操作自动化',
        gitAutomationDesc: '简化 Git 工作流程，提高团队协作效率',
        configManagement: '配置管理',
        configManagementDesc: '灵活的项目配置管理，支持多环境部署',
        installGuide: '安装指南',
        usageGuide: '使用方法',
        initProject: '初始化新项目',
        manageConfig: '管理项目配置',
        gitHelper: 'Git 操作助手',
        madeWith: '由 Project Mate 团队用 ❤️ 制作'
    }
};

async function setLanguage(lang) {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('preferred-language', lang);
    
    // Get all element groups
    const navLinks = document.querySelectorAll('.nav-links a[data-i18n] span');
    const featureCards = document.querySelectorAll('.feature-card');
    const otherElements = document.querySelectorAll('[data-i18n]:not(.nav-links a):not(.feature-card *), .code-block');
    
    // Store feature cards' current heights and content
    const cardStates = {};
    featureCards.forEach((card, index) => {
        cardStates[index] = {
            height: card.offsetHeight,
            content: card.querySelector('.feature-content')
        };
    });

    // Start nav links animation
    navLinks.forEach(element => {
        element.classList.add('fade-out');
    });

    // Start feature cards animation
    featureCards.forEach((card, index) => {
        const content = cardStates[index].content;
        if (content) {
            card.style.height = `${cardStates[index].height}px`;
            content.classList.add('fade-out');
        }
    });

    // Start other elements animation
    otherElements.forEach(element => {
        element.classList.add('fade-out');
    });

    // Wait for fade-out animations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            if (element.tagName.toLowerCase() === 'a' && element.querySelector('span')) {
                element.querySelector('span').textContent = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });

    // Force reflow
    document.body.offsetHeight;

    // Animate feature cards to new heights
    featureCards.forEach((card, index) => {
        const content = cardStates[index].content;
        const newHeight = card.scrollHeight;

        requestAnimationFrame(() => {
            card.style.height = `${newHeight}px`;
            if (content) {
                content.classList.remove('fade-out');
                content.classList.add('fade-in');
            }
        });
    });

    // Start fade-in animations
    navLinks.forEach(element => {
        element.classList.remove('fade-out');
        element.classList.add('fade-in');
    });

    otherElements.forEach(element => {
        element.classList.remove('fade-out');
        element.classList.add('fade-in');
    });

    // Clean up
    setTimeout(() => {
        // Reset feature cards height
        featureCards.forEach(card => {
            card.style.height = '';
            const content = card.querySelector('.feature-content');
            if (content) {
                content.classList.remove('fade-in');
            }
        });

        // Remove animation classes
        document.querySelectorAll('[data-i18n], .code-block').forEach(element => {
            element.classList.remove('fade-in');
        });
    }, 500);

    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-lang') === lang;
        btn.classList.toggle('active', isActive);
    });
}

// Initialize language
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferred-language') || 'zh';
    setLanguage(savedLang);

    // Add click handlers to language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
});
