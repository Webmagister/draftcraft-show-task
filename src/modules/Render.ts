function removeAllChildren(anchor: HTMLElement): void {
    Array.from(anchor.childNodes).forEach((child: HTMLElement) => anchor.removeChild(child));
}

export default function render(anchor: HTMLElement, ...components: HTMLElement[]): void {
    removeAllChildren(anchor);

    components.forEach((component: HTMLElement) => anchor.appendChild(component));
}
