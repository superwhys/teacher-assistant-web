import { h } from 'vue'
import { ElMessageBox, ElScrollbar, type ElMessageBoxOptions } from 'element-plus'
import '@/styles/confirmDialog.css'

export function confirmDialog(message: string, title: string, options: ElMessageBoxOptions = {}) {
    return ElMessageBox.confirm(
        h(ElScrollbar, { class: 'app-confirm-dialog__scrollbar', height: '100%', always: true }, {
            default: () => h('div', { class: 'app-confirm-dialog__message' }, message),
        }),
        title,
        {
            ...options,
            customClass: ['app-confirm-dialog', options.customClass].filter(Boolean).join(' '),
        },
    )
}
