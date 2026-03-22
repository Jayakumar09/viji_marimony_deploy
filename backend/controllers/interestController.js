const { prisma } = require('../utils/database');

const sendInterest = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send interest to yourself' });
    }

    // Check if receiver existsres
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isActive: true }
    });

    if (!receiver || !receiver.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if interest already exists
    const existingInterest = await prisma.interest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId
        }
      }
    });

    if (existingInterest) {
      return res.status(400).json({ 
        error: 'Interest already sent',
        status: existingInterest.status
      });
    }

    // Create new interest
    const interest = await prisma.interest.create({
      data: {
        senderId,
        receiverId,
        message: message || null
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Interest sent successfully',
      interest
    });

  } catch (error) {
    console.error('Send interest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReceivedInterests = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      receiverId,
      ...(status && { status: status.toUpperCase() })
    };

    const [interests, totalCount] = await Promise.all([
      prisma.interest.findMany({
        where,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          status: true,
          message: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              age: true,
              gender: true,
              city: true,
              state: true,
              education: true,
              profession: true,
              profilePhoto: true,
              isVerified: true,
              isPremium: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.interest.count({ where })
    ]);

    res.json({
      interests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalInterests: totalCount,
        hasNext: skip + interests.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get received interests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSentInterests = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      senderId,
      ...(status && { status: status.toUpperCase() })
    };

    const [interests, totalCount] = await Promise.all([
      prisma.interest.findMany({
        where,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          status: true,
          message: true,
          createdAt: true,
          updatedAt: true,
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              age: true,
              gender: true,
              city: true,
              state: true,
              education: true,
              profession: true,
              profilePhoto: true,
              isVerified: true,
              isPremium: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.interest.count({ where })
    ]);

    res.json({
      interests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalInterests: totalCount,
        hasNext: skip + interests.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get sent interests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const respondToInterest = async (req, res) => {
  try {
    const { interestId } = req.params;
    const { status } = req.body; // ACCEPTED or REJECTED
    const userId = req.user.id;

    if (!['ACCEPTED', 'REJECTED'].includes(status.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid status. Must be ACCEPTED or REJECTED' });
    }

    // Find the interest
    const interest = await prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!interest) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    // Check if user is the receiver
    if (interest.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this interest' });
    }

    // Check if interest is still pending
    if (interest.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Interest already ${interest.status.toLowerCase()}` 
      });
    }

    // Update interest status
    const updatedInterest = await prisma.interest.update({
      where: { id: interestId },
      data: { status: status.toUpperCase() },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // If accepted, create mutual messaging capability
    if (status.toUpperCase() === 'ACCEPTED') {
      // You could implement a notification system here
      // or create a connection/match record
    }

    res.json({
      message: `Interest ${status.toLowerCase()}`,
      interest: updatedInterest
    });

  } catch (error) {
    console.error('Respond to interest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getInterestStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [pendingCount, acceptedCount, rejectedCount, sentCount] = await Promise.all([
      prisma.interest.count({
        where: {
          receiverId: userId,
          status: 'PENDING'
        }
      }),
      prisma.interest.count({
        where: {
          receiverId: userId,
          status: 'ACCEPTED'
        }
      }),
      prisma.interest.count({
        where: {
          receiverId: userId,
          status: 'REJECTED'
        }
      }),
      prisma.interest.count({
        where: {
          senderId: userId
        }
      })
    ]);

    res.json({
      stats: {
        received: {
          pending: pendingCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
          total: pendingCount + acceptedCount + rejectedCount
        },
        sent: {
          total: sentCount
        }
      }
    });

  } catch (error) {
    console.error('Get interest stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  sendInterest,
  getReceivedInterests,
  getSentInterests,
  respondToInterest,
  getInterestStats
};