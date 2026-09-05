import { defineStore } from "pinia";

// 人脸识别认证状态：法人实名（链上身份）+ 管理员操作核验
export const useAuthStore = defineStore("auth", {
  state: () => ({
    legalVerified: false,   // 法人人脸实名（链上身份绑定）
    legalName: "",
    legalDid: "",           // 链上身份 DID
    adminVerified: false,   // 管理员操作人脸核验（会话级）
    adminTime: "",
    faceToken: "",          // 一次性人脸令牌（关键交易动作步进核验：review / pay）
  }),
  actions: {
    verifyLegal(name?: string) {
      this.legalVerified = true;
      this.legalName = name || "法定代表人";
      this.legalDid = "did:chainmaker:legal:" + (0x9f2a + this.legalName.length * 7).toString(16);
    },
    verifyAdmin() {
      this.adminVerified = true;
      this.adminTime = "刚刚";
    },
    resetAdmin() { this.adminVerified = false; this.adminTime = ""; },
    grantFace(scene: string) { this.faceToken = scene; },
    consumeFace(scene: string) { if (this.faceToken === scene) { this.faceToken = ""; return true; } return false; },
  },
});
