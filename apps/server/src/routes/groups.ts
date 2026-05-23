import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { GroupModel } from '../models/Group';
import { MessageModel } from '../models/Message';
import { UserModel } from '../models/User';

const router = Router();

// Get all groups for the logged-in user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const groups = await GroupModel.find({ members: req.user!.id }).populate('members', 'name email');
    res.json({ status: 'success', groups });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch groups' });
  }
});

// Create a new group
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, memberEmails } = req.body;
    if (!name) return res.status(400).json({ status: 'error', message: 'Group name is required' });

    const memberIds = [req.user!.id]; // Auto-add creator

    if (memberEmails && Array.isArray(memberEmails)) {
      const users = await UserModel.find({ email: { $in: memberEmails } });
      users.forEach(u => {
        if (u._id.toString() !== req.user!.id) memberIds.push(u._id.toString());
      });
    }

    const newGroup = new GroupModel({ name, members: memberIds });
    await newGroup.save();

    res.status(201).json({ status: 'success', group: newGroup });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to create group' });
  }
});

// Get messages for a group
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const group = await GroupModel.findById(req.params.id);
    if (!group || !group.members.includes(req.user!.id as any)) {
      return res.status(403).json({ status: 'error', message: 'Not authorized for this group' });
    }

    const messages = await MessageModel.find({ groupId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name email');

    res.json({ status: 'success', messages });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch messages' });
  }
});

// Add members to an existing group
router.post('/:id/members', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { memberEmails } = req.body;
    if (!memberEmails || !Array.isArray(memberEmails)) {
      return res.status(400).json({ status: 'error', message: 'memberEmails array is required' });
    }

    const group = await GroupModel.findById(req.params.id);
    if (!group) return res.status(404).json({ status: 'error', message: 'Group not found' });
    
    // Check if user is in the group
    if (!group.members.includes(req.user!.id as any)) {
      return res.status(403).json({ status: 'error', message: 'Not authorized for this group' });
    }

    const users = await UserModel.find({ email: { $in: memberEmails } });
    let addedCount = 0;
    
    users.forEach(u => {
      const uid = u._id.toString();
      if (!group.members.includes(uid as any)) {
        group.members.push(uid as any);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await group.save();
    }

    res.json({ status: 'success', message: `Added ${addedCount} members`, group });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to add members' });
  }
});

export const groupRouter = router;
