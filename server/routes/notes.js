import express from 'express';
import Note from '../models/Note.js';
import clerkAuth from '../middleware/clerkAuth.js';

const router = express.Router();

const mapNote = (n) => ({
  id: n._id,
  title: n.title,
  content: n.content,
  color: n.color,
  updatedAt: n.updatedAt || n.updatedAt,
});

router.get('/', clerkAuth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ notes: notes.map(mapNote) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes', error: err.message });
  }
});

router.post('/', clerkAuth, async (req, res) => {
  try {
    const { title, content, color } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const note = await Note.create({ user: req.user._id, title, content: content || '', color: color || 'indigo', updatedAt: new Date() });
    res.status(201).json({ note: mapNote(note) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create note', error: err.message });
  }
});

router.put('/:id', clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, color } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title, content, color, updatedAt: new Date() },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ note: mapNote(note) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update note', error: err.message });
  }
});

router.delete('/:id', clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Note.findOneAndDelete({ _id: id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note', error: err.message });
  }
});

export default router;
