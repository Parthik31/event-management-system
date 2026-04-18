import Support from '../models/Support.js';

// @desc    Create Support Ticket
// @route   POST /api/v1/support
// @access  Private (User/Organizer)
export const createSupportTicket = async (req, res) => {
  try {
    const { name, email, role, subject, description } = req.body;
    
    if (!name || !email || !subject || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields: name, email, subject, and description' 
      });
    }
    
    const ticket = await Support.create({
      user: req.user ? req.user.id : null, 
      name,
      email,
      role: role || 'user', // Fallback to 'user' if role isn't explicitly passed
      subject,
      description
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get All Tickets
// @route   GET /api/v1/support
// @access  Private (Admin)
export const getTickets = async (req, res) => {
  try {
    const tickets = await Support.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
