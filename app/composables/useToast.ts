import { useToastStore } from '~/stores/toast'

export const useToast = () => {
  const store = useToastStore()

  return {
    success: (msg: string) => store.add('success', msg),
    error: (msg: string) => store.add('error', msg),
    warning: (msg: string) => store.add('warning', msg),
    info: (msg: string) => store.add('info', msg),
    remove: (id: string) => store.remove(id)
  }
}