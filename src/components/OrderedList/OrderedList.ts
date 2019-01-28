import render from '../../modules/Render';

class OrderedList {
    public readonly element: HTMLOListElement;

    constructor(...elements: HTMLLIElement[]) {
        this.element = document.createElement('ol');
        this.element.classList.add('list');

        this.render(...elements);
    }

    private render(...elements: HTMLLIElement[]): void {
        render(this.element, ...elements);
    }
}

export default OrderedList;
