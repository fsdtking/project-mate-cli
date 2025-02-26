document.addEventListener('DOMContentLoaded', () => {
    // Add animation to hero subtitle
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        const chars = heroSubtitle.querySelectorAll('.char');
        chars.forEach((char, index) => {
            // Add a base delay before starting animations
            const baseDelay = 0.3;
            // Increase delay for each character, but with diminishing time gaps
            const charDelay = index * 0.06;
            char.style.animationDelay = `${baseDelay + charDelay}s`;
        });
    }

    // Add typing animation to hero code block
    const heroCodeBlock = document.querySelector('.hero .code-block');
    if (heroCodeBlock) {
        const text = heroCodeBlock.querySelector('.typing-text');
        if (text) {
            // Create a temporary element to measure the text width
            const temp = document.createElement('span');
            temp.style.visibility = 'hidden';
            temp.style.position = 'absolute';
            temp.style.whiteSpace = 'pre';
            temp.style.font = window.getComputedStyle(text).font;
            temp.textContent = text.textContent;
            document.body.appendChild(temp);

            // Get the actual text width and remove the temp element
            const textWidth = temp.offsetWidth;
            document.body.removeChild(temp);

            // Set the custom property for the typing animation
            text.style.setProperty('--typing-width', `${textWidth}px`);

            function resetAnimation() {
                text.style.animation = 'none';
                text.offsetHeight; // Trigger reflow
                text.style.animation = '';
            }

            // Reset animation periodically
            setInterval(resetAnimation, 6000); // Reset every 6 seconds

            // Add hover effect
            heroCodeBlock.addEventListener('mouseenter', resetAnimation);
        }
    }

    // Add copy functionality with centered alignment
    document.querySelectorAll('.copy-btn').forEach(btn => {
        // Center the button vertically
        const codeBlock = btn.closest('.code-block');
        if (codeBlock) {
            const codeBlockHeight = codeBlock.offsetHeight;
            const btnHeight = btn.offsetHeight;
            btn.style.top = `${(codeBlockHeight - btnHeight) / 2}px`;
        }

        // Add click handler
        btn.addEventListener('click', () => {
            const code = btn.previousElementSibling.textContent;
            navigator.clipboard.writeText(code).then(() => {
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 2000);
            });
        });
    });
});
