import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import { store, ContribDimKey } from '../../store';
import './index.css';

interface SvcType { key: string; name: string; icon: string; value: number; dim: ContribDimKey; }
const TYPES: SvcType[] = [
  { key: 'volunteer', name: '志愿服务', icon: '❤️', value: 15, dim: 'custom' },
  { key: 'help', name: '邻里互助', icon: '🤝', value: 10, dim: 'custom' },
  { key: 'elder', name: '助老关爱', icon: '👵', value: 15, dim: 'custom' },
  { key: 'child', name: '儿童关爱', icon: '🧒', value: 15, dim: 'custom' },
  { key: 'culture', name: '文体活动', icon: '🎭', value: 5, dim: 'custom' },
  { key: 'skill', name: '技能传授', icon: '🎓', value: 20, dim: 'growth' },
  { key: 'env', name: '环境整治', icon: '🌳', value: 10, dim: 'custom' },
  { key: 'govern', name: '议事监督', icon: '🗳️', value: 5, dim: 'governance' },
];

export default function ContribSubmitPage() {
  const [type, setType] = useState<SvcType | null>(null);
  const [desc, setDesc] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [beneficiary, setBeneficiary] = useState('');
  const [review, setReview] = useState('');
  const org = store.adminLabel();

  const addMedia = (kind: string) => { if (media.length >= 6) { Taro.showToast({ title: '最多 6 个', icon: 'none' }); return; } setMedia([...media, kind]); };

  const submit = () => {
    if (!store.requireBound()) return;
    if (!type) { Taro.showToast({ title: '请选择服务类型', icon: 'none' }); return; }
    if (!desc.trim()) { Taro.showToast({ title: '请填写做了什么', icon: 'none' }); return; }
    if (!media.length) { Taro.showToast({ title: '请至少上传 1 个照片/视频留痕', icon: 'none' }); return; }
    if (!beneficiary.trim()) { Taro.showToast({ title: '请填写受益者', icon: 'none' }); return; }
    const photos = media.filter(m => m === '照片').length;
    const videos = media.filter(m => m === '视频').length;
    const proof = `📷 ${photos} 张照片${videos ? ` + ${videos} 段视频` : ''}`;
    store.addContribution(type.dim, `${type.name}·${desc.trim()}`, type.value, {
      proof, beneficiary: beneficiary.trim(), review: review.trim() || '（待受益者确认评价）',
    });
    Taro.showModal({
      title: '已提交，待审核',
      content: `贡献「${type.name}」已提交，附 ${proof}、受益者「${beneficiary.trim()}」。\n\n经${org}核实留痕与受益者评价属实后，+${type.value} 社会贡献值将计入你的账户并上链存证。虚报将被驳回。`,
      showCancel: false,
      success: () => Taro.navigateBack(),
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">➕ 申报社会贡献值</Text>
        <Text className="hero-s">做了好事 · 留痕 + 受益者评价 · 提交{org}审核确认后计分</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="card">
          <Text className="label">① 服务类型</Text>
          <View className="types">
            {TYPES.map(t => (
              <View key={t.key} className={`type ${type?.key === t.key ? 'type-on' : ''}`} onClick={() => setType(t)}>
                <Text className="type-i">{t.icon}</Text>
                <Text className="type-n">{t.name}</Text>
                <Text className="type-v">+{t.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="card">
          <Text className="label">② 做了什么</Text>
          <Textarea className="ta" placeholder="简述你做的好事，如：帮独居王奶奶买菜送药、组织村里象棋赛…" value={desc} onInput={e => setDesc(e.detail.value)} maxlength={80} />
        </View>

        <View className="card">
          <Text className="label">③ 留痕（照片 / 视频）*</Text>
          <View className="media">
            {media.map((m, i) => (
              <View key={i} className="media-item"><Text className="media-e">{m === '视频' ? '🎬' : '🖼️'}</Text><Text className="media-x" onClick={() => setMedia(media.filter((_, j) => j !== i))}>✕</Text></View>
            ))}
            <View className="media-add" onClick={() => addMedia('照片')}><Text className="media-add-t">＋照片</Text></View>
            <View className="media-add" onClick={() => addMedia('视频')}><Text className="media-add-t">＋视频</Text></View>
          </View>
          <Text className="hint">演示：点击添加占位；正式版调用相机 / 相册上传真实照片、视频，作为审核凭证。</Text>
        </View>

        <View className="card">
          <Text className="label">④ 受益者 *</Text>
          <Input className="inp" placeholder="谁受益，如：张桂英（独居老人）/ 参与村民 12 人" value={beneficiary} onInput={e => setBeneficiary(e.detail.value)} />
          <Text className="label" style={{ marginTop: '20rpx' }}>⑤ 受益者评价（可留待受益者确认）</Text>
          <Textarea className="ta" placeholder="受益者对本次服务的评价…（留空则待受益者收到通知后确认打分）" value={review} onInput={e => setReview(e.detail.value)} maxlength={60} />
        </View>

        <View className="tip"><Text className="tip-t">🚩 提交后由{org}核实留痕与受益者评价属实，确认后 +{type?.value || 0} 社会贡献值计入账户、上链存证；虚报将被驳回，不计分。</Text></View>
        <View className="submit" onClick={submit}><Text className="submit-t">提交申报{type ? ` · 待计 +${type.value}` : ''}</Text></View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
