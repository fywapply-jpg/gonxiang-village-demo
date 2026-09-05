import { defineStore } from "pinia";

/** 全局体验设置：大字模式等（对应细则「低门槛适配」） */
export const useAppStore = defineStore("app", {
  state: () => ({
    elderMode: false,
    notifyOrder: true,
    notifyFinance: true,
    notifyLogistics: true,
  }),
  actions: {
    toggleElder() {
      this.elderMode = !this.elderMode;
      // #ifdef H5
      document.body.classList.toggle("sg-elder", this.elderMode);
      // #endif
    },
  },
});
