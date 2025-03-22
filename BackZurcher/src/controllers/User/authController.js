const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Staff } = require('../../data');
const { generateToken } = require('../../middleware/isAuth');
const { CustomError } = require('../../middleware/error');



const register = async (req, res, next) => {
  try {
    const { email, password, role, phone = 'Admin', ...staffData } = req.body;

    // Verificar si el correo ya existe
    const existingStaff = await Staff.findOne({ 
      where: { 
        email,
        deletedAt: null 
      } 
    });

    if (existingStaff) {
      throw new CustomError('El correo ya está registrado', 400);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newStaff = await Staff.create({
      ...staffData,
      email,
      password: hashedPassword,
      role,
      phone,
      isActive: true,
      lastLogin: new Date()
    });

    // Generar token JWT
    const token = generateToken(newStaff);

    // Usar el método toJSON definido en el modelo
    const staffResponse = newStaff.toJSON();

    res.status(201).json({
      error: false,
      message: 'Usuario registrado exitosamente',
      data: { token, user: staffResponse }
    });

  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const staff = await Staff.findOne({ 
      where: { 
        email,
        isActive: true,
        deletedAt: null
      } 
    });

    if (!staff) {
      throw new CustomError('Credenciales inválidas', 400);
    }

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(password, staff.password);
    if (!validPassword) {
      throw new CustomError('Credenciales inválidas', 400);
    }

    // Actualizar último login
    await staff.update({ lastLogin: new Date() });

    // Generar token JWT
    const token = generateToken(staff);

    // Usar el método toJSON definido en el modelo
    const staffResponse = staff.toJSON();

    res.json({
      error: false,
      message: 'Login exitoso',
      data: { token, staff: staffResponse }
    });

  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { id } = req.staff;
    await Staff.update(
      { lastLogout: new Date() },
      { where: { id } }
    );

    res.json({
      error: false,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;
    
    // Si el rol es Customer, se impide el cambio mediante este endpoint
    if (role === 'Admin') {
      throw new CustomError('Los Admin no pueden cambiar la contraseña desde esta sección. Utilice el proceso de recuperación de contraseña.', 403);
    }
    
    const staff = await Staff.findByPk(id);
    
    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, staff.password);
    if (!validPassword) {
      throw new CustomError('Contraseña actual incorrecta', 400);
    }
    
    // Hash y actualizar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await staff.update({ password: hashedPassword });
    
    res.json({
      error: false,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  changePassword
};