import { readFileSync } from 'fs-extra';
import { join } from 'path';
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        container: '.container',
        leftPanel: '.left-panel',
        rightPanel: '.right-panel',
        elementList: '.element-list',
    },
    methods: {
        hello() {
            console.log('[script-cop.default]: hello');
        },
        
        // 处理搜索按钮点击
        handleSearchClick() {
            console.log('Search button clicked');
            // 这里可以添加搜索功能的实现
        },

        // 添加元素项点击处理方法
        handleElementClick(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (target.classList.contains('element-item')) {
                // 处理元素点击
                console.log('Clicked element:', target.textContent);
            }
        }
    },
    ready() {
        // 添加事件监听
        if (this.$.elementList) {
            this.$.elementList.addEventListener('click', this.handleElementClick.bind(this));
        }
    },
    beforeClose() { },
    close() {
        // 清理事件监听
        if (this.$.elementList) {
            this.$.elementList.removeEventListener('click', this.handleElementClick.bind(this));
        }
    },
});
