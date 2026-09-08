// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import BaseModal from '@/components/common/BaseModal.vue'

describe('BaseModal id attribute binding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders id attribute on the modal card when id prop is provided', () => {
    const wrapper = mount(BaseModal, {
      props: {
        id: 'test-modal-card-id',
        show: true
      },
      slots: {
        default: '<div class="content">Test Content</div>'
      },
      attachTo: document.body
    })

    const modalCard = document.getElementById('test-modal-card-id')
    expect(modalCard).not.toBeNull()
    expect(modalCard?.classList.contains('base-modal-card')).toBe(true)

    wrapper.unmount()
  })
})
