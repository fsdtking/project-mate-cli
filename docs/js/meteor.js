class MeteorEffect {
    constructor() {
        this.container = document.querySelector('.meteor-container');
        this.meteors = [];
        this.maxMeteors = 8;
        this.init();
    }

    init() {
        // 初始创建多个流星
        for (let i = 0; i < 4; i++) {
            setTimeout(() => this.createMeteor(), i * 500);
        }
        // 更频繁地创建新流星
        setInterval(() => this.createMeteor(), 1000);
    }

    createStar() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.style.filter = 'drop-shadow(0 0 4px var(--primary))';

        // 创建5个星角
        const points = [];
        const outerRadius = 10;
        const innerRadius = 4;
        
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / 5;
            const x = 12 + radius * Math.cos(angle);
            const y = 12 + radius * Math.sin(angle);
            points.push(`${x},${y}`);
        }

        const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        star.setAttribute('points', points.join(' '));
        star.setAttribute('fill', 'var(--primary)');
        star.setAttribute('opacity', '0.8');
        
        svg.appendChild(star);
        return svg;
    }

    createMeteor() {
        if (this.meteors.length >= this.maxMeteors) return;

        const meteor = document.createElement('div');
        meteor.className = 'meteor';
        
        // 添加SVG星星
        const star = this.createStar();
        meteor.appendChild(star);

        // 添加轨迹
        const trail = document.createElement('div');
        trail.className = 'meteor-trail';
        meteor.appendChild(trail);

        // Position and movement
        const startX = Math.random() * (window.innerWidth * 0.5);
        const startY = Math.random() * (window.innerHeight * 0.3);
        meteor.style.right = `${startX}px`;
        meteor.style.top = `${startY}px`;

        // Calculate movement distance
        const moveX = -window.innerWidth;
        const moveY = window.innerHeight * 1.5;
        meteor.style.setProperty('--meteor-x', `${moveX}px`);
        meteor.style.setProperty('--meteor-y', `${moveY}px`);

        // Random duration between 2-4 seconds
        const duration = 2 + Math.random() * 2;
        meteor.style.animation = `meteorMove ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`;

        this.container.appendChild(meteor);
        this.meteors.push(meteor);

        // Remove meteor after animation
        meteor.addEventListener('animationend', () => {
            meteor.remove();
            this.meteors = this.meteors.filter(m => m !== meteor);
        });
    }
}
}

document.addEventListener('DOMContentLoaded', () => {
    new MeteorEffect();
});
