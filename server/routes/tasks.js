import express from 'express';
import Task from '../models/Task.js';
import clerkAuth from '../middleware/clerkAuth.js';

const router = express.Router();

const mapTask = (t) => ({
  id: t._id,
  title: t.title,
  completed: t.completed,
  priority: t.priority,
  dueDate: t.dueDate,
});

router.get('/', clerkAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ tasks: tasks.map(mapTask) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
});

router.post('/', clerkAuth, async (req, res) => {
  try {
    const { title, priority = 'medium', dueDate } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const task = await Task.create({ user: req.user._id, title, priority, dueDate });
    res.status(201).json({ task: mapTask(task) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
});

router.put('/:id', clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed, priority, dueDate } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title, completed, priority, dueDate },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ task: mapTask(task) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
});

router.delete('/:id', clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Task.findOneAndDelete({ _id: id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
});

export default router;
