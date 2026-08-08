import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import './index.css';

interface Rec { name: string; url: string; icon: string; }
interface Msg { from: 'ai' | 'me'; text: string; recs?: Rec[]; }

const QUICK = ['我想买农资农机', '我家农产品想卖', '办医保社保', '想学门手艺', '缺钱周转', '养老带娃'];

// 自然语言意图识别 → 聚合推荐相关功能/商品（演示为规则引擎，可平滑替换为大模型）
function reply(s: string): Msg {
  const has = (...ks: string[]) => ks.some(k => s.includes(k));
  if (has('买', '农资', '种子', '化肥', '农药', '农膜', '农机', '拖拉机', '收割', '打药'))
    return { from: 'ai', text: '为你找到「农资农机」和「双向流通·采购大厅」——种子化肥农机集采更便宜，还能拼农机联合作业：', recs: [{ name: '农资农机', url: '/pages/agri-rental/index', icon: '🚜' }, { name: '双向流通', url: '/pages/exchange/index', icon: '🤝' }] };
  if (has('卖', '我家', '农产品', '苹果', '枣', '菜', '粮', '销', '收购'))
    return { from: 'ai', text: '想把农产品卖出去，推荐这几条路：产销对接发布、双向流通供应大厅对接社区/国央企、或自己开村集体小卖部：', recs: [{ name: '产销对接', url: '/pages/sales/index', icon: '📢' }, { name: '双向流通·供应厅', url: '/pages/exchange/index', icon: '🌾' }, { name: '供享·小卖部', url: '/pkgShop/my-store/index', icon: '🏪' }] };
  if (has('医', '病', '社保', '医保', '看病', '健康', '挂号', '政务', '办事'))
    return { from: 'ai', text: '这些便民服务能帮到你：', recs: [{ name: '健康医疗', url: '/pages/health/index', icon: '🏥' }, { name: '政务办事', url: '/pages/gov/index', icon: '🏛️' }] };
  if (has('学', '技能', '培训', '直播', '手艺', '课', '带货'))
    return { from: 'ai', text: '技能学堂满 5-10 人即可开班，还有手机直播带货课：', recs: [{ name: '技能学堂', url: '/pages/school/index', icon: '📚' }] };
  if (has('钱', '贷', '资金', '周转', '保险', '补贴', '授信'))
    return { from: 'ai', text: '助农金融按你的地和种植做授信，还有农业保险与补贴查询：', recs: [{ name: '助农金融', url: '/pages/finance/index', icon: '💰' }] };
  if (has('老', '小孩', '孩子', '照料', '陪诊', '拼车', '养老', '带娃'))
    return { from: 'ai', text: '一老一小和邻里互助可以帮上忙：', recs: [{ name: '一老一小', url: '/pages/care/index', icon: '👵' }, { name: '邻里互助', url: '/pages/neighbor/index', icon: '🤝' }] };
  if (has('党', '支部', '组织', '积分', '贡献', '志愿'))
    return { from: 'ai', text: '党建与社会贡献相关：', recs: [{ name: '党建联建地图', url: '/pkgParty/party-map/index', icon: '🚩' }, { name: '社会贡献值', url: '/pages/contribution/index', icon: '⭐' }] };
  return { from: 'ai', text: '我能帮你找：买农资农机、卖农产品、办医保社保、学技能、资金周转、养老带娃、党建贡献……你直接说想干啥就行～', recs: [] };
}

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: '你好！我是供享小智 🤖 说说你想干啥，我帮你找对功能和好物。比如"我想买化肥""我家苹果想卖"。' }]);
  const [val, setVal] = useState('');
  const send = (q: string) => {
    const t = q.trim(); if (!t) return;
    setMsgs(m => [...m, { from: 'me', text: t }, reply(t)]);
    setVal('');
  };
  const go = (url: string) => { Taro.navigateTo({ url }).catch(() => Taro.reLaunch({ url })); };

  return (
    <View className="page">
      <ScrollView scrollY scrollIntoView="" className="chat">
        {msgs.map((m, i) => (
          <View key={i} className={`row ${m.from}`}>
            {m.from === 'ai' && <Text className="ava">🤖</Text>}
            <View className="bubble">
              <Text className="btext">{m.text}</Text>
              {m.recs && m.recs.length > 0 && (
                <View className="recs">
                  {m.recs.map(rec => (
                    <View key={rec.url} className="rec" onClick={() => go(rec.url)}>
                      <Text className="rec-i">{rec.icon}</Text><Text className="rec-n">{rec.name}</Text><Text className="rec-go">›</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
        <View className="quicks">
          {QUICK.map(q => <View key={q} className="quick" onClick={() => send(q)}><Text className="quick-t">{q}</Text></View>)}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
      <View className="inbar">
        <Input className="inp" value={val} onInput={e => setVal(e.detail.value)} placeholder="说说你想干啥…" confirmType="send" onConfirm={() => send(val)} />
        <View className="send" onClick={() => send(val)}><Text className="send-t">发送</Text></View>
      </View>
    </View>
  );
}
