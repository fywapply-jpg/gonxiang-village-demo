import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import TabBar from '../../components/TabBar';
import './index.css';

type Kind = '出租' | '转售' | '求购';
interface Item { id: number; title: string; emoji: string; kind: Kind; price: string; owner: string; village: string; desc: string; }

// 村民版：农机农具闲置
const ITEMS_VILLAGE: Item[] = [
  { id: 1, title: '小型旋耕机', emoji: '🚜', kind: '出租', price: '¥80/天', owner: '李建国', village: '范庄村', desc: '九成新久保田旋耕机，适合1-5亩地，可送货上门。' },
  { id: 2, title: '二手农用三轮车', emoji: '🛺', kind: '转售', price: '¥3200', owner: '王秀兰', village: '李庄村', desc: '八成新，电启动，载重1吨，换大车便宜出。' },
  { id: 3, title: '玉米脱粒机', emoji: '🌽', kind: '求购', price: '面议', owner: '张大力', village: '张庄村', desc: '想收一台二手脱粒机，秋收用，价格好商量。' },
  { id: 4, title: '背负式喷雾打药机', emoji: '💦', kind: '出租', price: '¥30/天', owner: '赵明', village: '赵庄村', desc: '电动喷雾器2台，打药季按天出租，押金100。' },
  { id: 5, title: '联合收割机预约', emoji: '🌾', kind: '出租', price: '¥600/亩', owner: '方城农机合作社', village: '方城乡', desc: '麦收/秋收联合收割，提前3天预约，跨村作业。' },
  { id: 6, title: '闲置烤烟房', emoji: '🏚️', kind: '转售', price: '¥1.2万', owner: '刘芳', village: '刘庄村', desc: '标准化烤烟房一座，不种烟了整体转让。' },
];

// 居民版：城市家庭闲置（工具/家电/母婴/家具）
const ITEMS_COMMUNITY: Item[] = [
  { id: 1, title: '儿童平衡车', emoji: '🚲', kind: '转售', price: '¥120', owner: '3号楼·李姐', village: '阳光社区', desc: '宝宝长大用不上了，九成新平衡车便宜出，可当面交易。' },
  { id: 2, title: '家用折叠跑步机', emoji: '🏃', kind: '转售', price: '¥600', owner: '5号楼·王哥', village: '阳光社区', desc: '八成新，折叠省地方，搬家出，楼下自提。' },
  { id: 3, title: '电动工具套装', emoji: '🔧', kind: '出租', price: '¥20/天', owner: '2号楼·张师傅', village: '阳光社区', desc: '电钻/电锤/切割机，装修偶尔用，按天出租，押金200。' },
  { id: 4, title: '高景观婴儿推车', emoji: '🍼', kind: '转售', price: '¥200', owner: '8号楼·陈姐', village: '幸福里', desc: '几乎全新，宝宝用不上了，含凉席和挂篮。' },
  { id: 5, title: '折叠桌椅（社区便民）', emoji: '🪑', kind: '出租', price: '¥10/天', owner: '楼下便民服务点', village: '幸福里', desc: '聚会/摆摊用折叠桌椅，社区便民出租，押金50。' },
  { id: 6, title: '二手婴儿床', emoji: '🛏️', kind: '求购', price: '面议', owner: '6号楼·刘女士', village: '阳光社区', desc: '想收一张实木婴儿床，环保无异味优先，价格好商量。' },
];

const KIND_STYLE: Record<Kind, { bg: string; color: string }> = {
  '出租': { bg: '#dbeafe', color: '#2563eb' },
  '转售': { bg: '#dcfce7', color: '#16a34a' },
  '求购': { bg: '#fef3c7', color: '#d97706' },
};
const FILTERS = ['全部', '出租', '转售', '求购'] as const;

export default function BarterPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('全部');
  const [community, setCommunity] = useState(store.isCommunity());
  useDidShow(() => setCommunity(store.isCommunity()));

  const items = community ? ITEMS_COMMUNITY : ITEMS_VILLAGE;
  const sub = community ? '工具·家电·母婴·闲置 · 出租转售求购，资源不浪费' : '农机·工具·闲置 · 出租转售求购，资源不浪费';

  const contact = (it: Item) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: it.kind === '求购' ? '我有这个' : '我想要',
      content: `${it.kind === '求购' ? '联系' : '联系发布人'} ${it.owner}（${it.village}）\n${it.title} · ${it.price}\n\n正式版可直接发起聊天或拨打电话。`,
      confirmText: '联系TA',
      success: (res) => { if (res.confirm) Taro.showToast({ title: '已发送联系请求', icon: 'success' }); },
    });
  };
  const post = () => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '发布置换',
      content: community ? '把家里闲置的工具、家电、母婴用品发布出来，可选择出租、转售或求购。正式版支持上传图片。' : '把家里闲置的农机、工具发布出来，可选择出租、转售或求购。正式版支持上传图片。',
      showCancel: false,
    });
  };

  const list = filter === '全部' ? items : items.filter(i => i.kind === filter);

  return (
    <View className="page">
      <View className="header">
        <Text className="header-title">🔄 邻里置换</Text>
        <Text className="header-sub">{sub}</Text>
      </View>

      <View className="filter-bar">
        {FILTERS.map(f => (
          <View key={f} className={`filter-item ${filter === f ? 'filter-active' : ''}`} onClick={() => setFilter(f)}>
            <Text className="filter-text">{f}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          {list.map(it => (
            <View key={it.id} className="item-card">
              <View className="item-thumb"><Text style={{ fontSize: '56rpx' }}>{it.emoji}</Text></View>
              <View className="item-info">
                <View className="item-top">
                  <Text className="item-title">{it.title}</Text>
                  <View className="item-kind" style={{ background: KIND_STYLE[it.kind].bg }}>
                    <Text className="item-kind-text" style={{ color: KIND_STYLE[it.kind].color }}>{it.kind}</Text>
                  </View>
                </View>
                <Text className="item-desc">{it.desc}</Text>
                <View className="item-foot">
                  <Text className="item-price">{it.price}</Text>
                  <Text className="item-owner">{it.owner} · {it.village}</Text>
                </View>
                <View className="item-btn" onClick={() => contact(it)}>
                  <Text className="item-btn-text">{it.kind === '求购' ? '我有这个' : '我想要'}</Text>
                </View>
              </View>
            </View>
          ))}
          {list.length === 0 && <Text className="empty-hint">暂无该类型信息</Text>}
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>

      <View className="fab" onClick={post}><Text className="fab-text">＋ 发布</Text></View>
      <TabBar active="barter" />
    </View>
  );
}
