// 账户登录云函数：用微信 openid 自动注册/登录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const users = db.collection('users');

  const res = await users.where({ _openid: OPENID }).get();
  if (res.data.length > 0) {
    // 老用户：直接返回
    return { user: res.data[0] };
  }

  // 新用户：自动注册
  const newUser = {
    name: '村民' + OPENID.slice(-4),
    phone: '',
    role: 'user',
    avatar: '',
    createdAt: db.serverDate(),
  };
  const add = await users.add({ data: newUser });
  return { user: { _id: add._id, _openid: OPENID, ...newUser } };
};
