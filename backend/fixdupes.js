process.chdir('/Users/apple/PeerSync/backend');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const users = await User.find({});
  for (const user of users) {
    user.followers = [...new Map(user.followers.map(id => [id.toString(), id])).values()];
    user.following = [...new Map(user.following.map(id => [id.toString(), id])).values()];
    user.followRequests = [...new Map(user.followRequests.map(id => [id.toString(), id])).values()];
    await user.save();
    console.log(`Fixed: ${user.username}`);
  }
  console.log('Done!');
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
