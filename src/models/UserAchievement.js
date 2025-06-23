// models/UserAchievement.js
const mongoose = require('mongoose');
const userAchievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  earnedAt: { type: Date, default: Date.now },
  isSeen: { type: Boolean, default: false }
});

module.exports = mongoose.model('UserAchievement', userAchievementSchema);