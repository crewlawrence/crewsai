const { generateCaptions } = require('../services/openai');
const User = require('../models/User');
const Usage = require('../models/Usage');

exports.generateCaptions = async (req, res) => {
  try {
    const { style } = req.body;
    const userId = req.user.id;

    // Check user's subscription
    const user = await User.findById(userId).populate('subscription');
    
    if (!user.subscription || user.subscription.status !== 'active') {
      return res.status(403).json({ error: 'Active subscription required' });
    }

    // Check monthly usage limit
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let usage = await Usage.findOne({ 
      userId, 
      month: currentMonth,
      year: currentYear 
    });

    // Determine limit based on plan
    const limit = user.subscription.plan === 'pro' ? 500 : 100;
    
    if (usage && usage.count >= limit) {
      return res.status(429).json({ 
        error: `Monthly limit of ${limit} captions reached. Upgrade or wait for next month.` 
      });
    }

    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');

    // Generate captions with OpenAI
    const captions = await generateCaptions(imageBase64, style || 'creative', 5);

    // Update usage count
    if (usage) {
      usage.count += 1;
      await usage.save();
    } else {
      await Usage.create({ 
        userId, 
        count: 1, 
        month: currentMonth,
        year: currentYear 
      });
    }

    res.json({ captions });
  } catch (error) {
    console.error('Generate captions error:', error);
    res.status(500).json({ error: 'Failed to generate captions' });
  }
};

// Get user's caption generation history/usage
exports.getUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const usage = await Usage.findOne({ 
      userId, 
      month: currentMonth,
      year: currentYear 
    });

    const user = await User.findById(userId).populate('subscription');
    const limit = user.subscription?.plan === 'pro' ? 500 : 100;

    res.json({
      used: usage?.count || 0,
      limit,
      remaining: limit - (usage?.count || 0),
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
};