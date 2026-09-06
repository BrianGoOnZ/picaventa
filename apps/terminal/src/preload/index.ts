import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('picaventa', {
  version: process.versions.electron
})
