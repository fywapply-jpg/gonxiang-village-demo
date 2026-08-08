// 村民议事云函数：真正多人共享的发帖 + 投票（防重复）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection('proposals');
  const action = event.action;

  // 提案列表（所有人可见，附带"我是否已投"）
  if (action === 'list') {
    const res = await col.orderBy('createdAt', 'desc').limit(50).get();
    const list = res.data.map((p) => ({
      _id: p._id,
      title: p.title,
      desc: p.desc,
      by: p.by,
      agree: p.agree || 0,
      oppose: p.oppose || 0,
      status: p.status || '表决中',
      voted: Array.isArray(p.voters) && p.voters.indexOf(OPENID) >= 0,
    }));
    return { list };
  }

  // 发起提案
  if (action === 'create') {
    const doc = {
      title: event.title || '未命名提案',
      desc: event.desc || '',
      by: event.by || '村民',
      agree: 0,
      oppose: 0,
      voters: [],
      status: '表决中',
      createdAt: db.serverDate(),
    };
    const add = await col.add({ data: doc });
    return { _id: add._id };
  }

  // 投票（同一 openid 只能投一次）
  if (action === 'vote') {
    const id = event.id;
    const opt = event.opt;
    const cur = await col.doc(id).get();
    if (!cur.data) return { error: 'not_found' };
    if (Array.isArray(cur.data.voters) && cur.data.voters.indexOf(OPENID) >= 0) {
      return { error: 'voted' };
    }
    const update = opt === 'agree' ? { agree: _.inc(1) } : { oppose: _.inc(1) };
    update.voters = _.push([OPENID]);
    await col.doc(id).update({ data: update });
    return { ok: true };
  }

  return { error: 'unknown_action' };
};
