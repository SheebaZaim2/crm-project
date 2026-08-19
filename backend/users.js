const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

const seededUsers = [
  {
    id: "U-001",
    fullName: "Samia Admin",
    email: "admin@divinenet.test",
    password: "admin123",
    role: "Admin"
  },
  {
    id: "U-002",
    fullName: "Sourav Manager",
    email: "manager@divinenet.test",
    password: "manager123",
    role: "CampaignManager"
  },
  {
    id: "U-003",
    fullName: "Praveen Staff",
    email: "staff@divinenet.test",
    password: "staff123",
    role: "MarketingStaff"
  },
  {
    id: "U-004",
    fullName: "Client Approver",
    email: "approver@divinenet.test",
    password: "approver123",
    role: "ClientApprover"
  }
];

const users = seededUsers.map((user) => ({
  ...user,
  passwordHash: bcrypt.hashSync(user.password, SALT_ROUNDS)
}));

function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
}

function findByEmail(email) {
  return users.find(
    (user) => user.email.toLowerCase() === String(email).toLowerCase()
  );
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(String(password), user.passwordHash);
}

module.exports = {
  findByEmail,
  verifyPassword,
  toPublicUser
};