import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import * as XLSX from 'xlsx';
import { store } from '../../store';
import './index.css';

// 系统序列号：唯一、不含易混字符(去 0O1IL)、绝不等于姓名/身份证；村委导入时自动派发，村民凭本人序列号绑定，杜绝冒充
const SN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function genSN(prefix: string, used: Set<string>): string {
  for (let attempt = 0; attempt < 60; attempt++) {
    let s = prefix + '-';
    for (let i = 0; i < 4; i++) s += SN_ALPHABET[Math.floor(Math.random() * SN_ALPHABET.length)];
    if (!used.has(s)) { used.add(s); return s; }
  }
  const s = prefix + '-' + Date.now().toString(36).slice(-4).toUpperCase();
  used.add(s); return s;
}

export default function RosterImport() {
  const [allowed, setAllowed] = useState(store.canManageVillage());
  const [head, setHead] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState('');
  const [imported, setImported] = useState<any[]>([]);

  useDidShow(() => {
    const ok = store.canManageVillage();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '无权访问', content: '成员名单导入仅村委 / 居委会 / 平台管理员可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  // 真实解析：XLSX 读取用户上传的 Excel → 取第一张表 → 转二维数组
  const parseWb = (data: ArrayBuffer, name: string) => {
    try {
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      const nonEmpty = all.filter(r => r.some(c => String(c).trim() !== ''));
      if (nonEmpty.length < 2) { Taro.showModal({ title: '解析结果', content: '表格没有有效数据行（需第一行表头 + 至少一行数据）', showCancel: false }); return; }
      setHead(nonEmpty[0].map(c => String(c)));
      setRows(nonEmpty.slice(1).map(r => r.map(c => String(c))));
      setFileName(name);
      Taro.showToast({ title: `真实解析 ${nonEmpty.length - 1} 条`, icon: 'success' });
    } catch (e) {
      Taro.showModal({ title: '解析失败', content: '请确认上传的是 .xlsx / .xls 名单文件。', showCancel: false });
    }
  };

  const pick = () => {
    if (process.env.TARO_ENV === 'weapp') {
      Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['xlsx', 'xls'] }).then((res: any) => {
        const f = res.tempFiles[0];
        Taro.getFileSystemManager().readFile({
          filePath: f.path,
          success: (r: any) => parseWb(r.data as ArrayBuffer, f.name),
          fail: () => Taro.showToast({ title: '文件读取失败', icon: 'none' }),
        });
      }).catch(() => { });
    } else {
      const doc: any = (typeof document !== 'undefined') ? document : null;
      if (!doc) { Taro.showToast({ title: '当前环境不支持', icon: 'none' }); return; }
      const input = doc.createElement('input');
      input.type = 'file'; input.accept = '.xlsx,.xls';
      input.onchange = (e: any) => {
        const file = e.target.files && e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev: any) => parseWb(ev.target.result, file.name);
        reader.readAsArrayBuffer(file);
      };
      input.click();
    }
  };

  const doImport = () => {
    const find = (kw: string[]) => head.findIndex(h => kw.some(k => h.includes(k)));
    const ci = { name: find(['姓名', '名字']), idcard: find(['身份证', '证件']), sn: find(['序列', '编号', '序号', '码']), family: find(['家庭', '户名', '户']), head: find(['户主']) };
    const prefix = store.orgType() === 'community' ? 'SQ' : 'FZ';
    const used = new Set<string>();
    let autoCount = 0;
    const members = rows.map(r => {
      const nm = ci.name >= 0 ? r[ci.name] : r[0];
      // 序列号：名册自带则沿用；否则系统自动派唯一号。绝不退回姓名/身份证，杜绝“输姓名即冒充”。
      let sn = ci.sn >= 0 ? String(r[ci.sn] || '').trim() : '';
      if (sn) { used.add(sn); } else { sn = genSN(prefix, used); autoCount++; }
      return {
        name: nm,
        idcard: ci.idcard >= 0 ? r[ci.idcard] : '',
        sn,
        family: ci.family >= 0 ? r[ci.family] : (nm ? nm + '户' : ''),
        isHead: ci.head >= 0 ? /是|户主|Y|✓/i.test(r[ci.head] || '') : false,
        org: store.orgType(),
      };
    });
    store.setRoster(members);
    setImported(members);
    setRows([]); setHead([]); setFileName('');
    Taro.showModal({ title: '✅ 已导入名册', content: `已导入 ${members.length} 名成员，其中 ${autoCount} 人由系统自动派发唯一「序列号」（下方表格可查、发给本人）。\n\n村民扫「一村一码」或输本人序列号即可实名绑定；对不上→保持游客。序列号不等于姓名/身份证，从源头杜绝冒充。`, confirmText: '完成', showCancel: false });
  };

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 名单导入仅村委 / 平台管理员可访问</Text></View>);
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">📇 成员名单导入</Text>
        <Text className="hero-s">上传 Excel，系统真实解析每一行；用户扫码进来后与名册比对自动认证</Text>
      </View>
      <View className="pickbar">
        <View className="pick-btn" onClick={pick}><Text className="pick-t">📎 选择 Excel 名单文件</Text></View>
        {fileName
          ? <Text className="fname">✅ 已解析：{fileName} · 共 {rows.length} 人</Text>
          : <Text className="ftip">支持 .xlsx / .xls；第一行为表头（如 姓名 / 身份证号 / 家庭 / 手机）</Text>}
      </View>
      {rows.length > 0 && (
        <ScrollView scrollX scrollY className="table">
          <View className="trow thead">
            <Text className="tcell tidx">#</Text>
            {head.map((h, i) => <Text key={i} className="tcell">{h || `列${i + 1}`}</Text>)}
          </View>
          {rows.map((r, ri) => (
            <View key={ri} className="trow">
              <Text className="tcell tidx">{ri + 1}</Text>
              {head.map((_, ci) => <Text key={ci} className="tcell">{r[ci] || ''}</Text>)}
            </View>
          ))}
        </ScrollView>
      )}
      {rows.length > 0 && (
        <View className="confirmbar" onClick={doImport}><Text className="confirm-t">确认导入 {rows.length} 人</Text></View>
      )}
      {imported.length > 0 && (
        <View style={{ margin: '24rpx' }}>
          <View style={{ marginBottom: '12rpx' }}><Text style={{ fontSize: '26rpx', fontWeight: 700, color: '#16a34a' }}>✅ 已导入 {imported.length} 人 · 系统序列号（发给本人用于实名绑定）</Text></View>
          <ScrollView scrollX scrollY className="table">
            <View className="trow thead">
              <Text className="tcell tidx">#</Text>
              <Text className="tcell">姓名</Text>
              <Text className="tcell">系统序列号</Text>
              <Text className="tcell">家庭</Text>
              <Text className="tcell">户主</Text>
            </View>
            {imported.map((m, i) => (
              <View key={i} className="trow">
                <Text className="tcell tidx">{i + 1}</Text>
                <Text className="tcell">{m.name}</Text>
                <Text className="tcell" style={{ fontWeight: 700, color: '#16a34a' }}>{m.sn}</Text>
                <Text className="tcell">{m.family}</Text>
                <Text className="tcell">{m.isHead ? '✓' : ''}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
