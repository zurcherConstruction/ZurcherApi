const { Staff } = require('../../data');
const { CustomError } = require('../../middleware/error');
const { catchedAsync } = require('../../utils/catchedAsync');
const bcrypt = require('bcrypt');

const getAllStaff = async (req, res) => {
    const staffers = await Staff.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
    });

    res.json({
        error: false,
        message: 'Staffers recuperados exitosamente',
        data: staffers
    });
};

const createStaff = async (req, res) => {
    const {name, email, password, role, phone, ...staffData } = req.body;

    // Validar rol permitido
    const allowedRoles = [ 'recept', 'admin', 'owner', 'worker'];
    if (!allowedRoles.includes(role)) {
        throw new CustomError('Rol no válido para staff', 400);
    }

    // Verificar email único
    const existingStaff = await Staff.findOne({ where: { email } });
    if (existingStaff) {
        throw new CustomError('El correo ya está registrado', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newStaff = await Staff.create({
        ...staffData,
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        isActive: true,
        createdBy: req.staff.id
    });

    // Remove password from response
    const staffResponse = { ...newStaff.toJSON() };
    delete staffResponse.password;

    res.status(201).json({
        error: false,
        message: 'Usuario staff creado exitosamente',
        data: staffResponse
    });
};

const updateStaff = async (req, res) => {
    const { id } = req.params;
    const {name, email, role, phone, ...updateData } = req.body;

    const staff = await Staff.findByPk(id);
    if (!staff) {
        throw new CustomError('Staff no encontrado', 404);
    }

    // Verificar email único si se está actualizando
    if (email && email !== staff.email) {
        const existingEmail = await Staff.findOne({ where: { email } });
        if (existingEmail) {
            throw new CustomError('El correo ya está en uso', 400);
        }
    }

    // Validar rol si se está actualizando
    const allowedRoles = ['admin', 'recept', 'worker', 'owner'];
    if (role && !allowedRoles.includes(role)) {
        throw new CustomError('Rol no válido para staff', 400);
    }

    await staff.update({
        ...updateData,
        name,
        email,
        role,
        phone,
        updatedBy: req.staff.id
    });

    const staffResponse = { ...staff.toJSON() };
    delete staffResponse.password;

    res.json({
        error: false,
        message: 'Usuario actualizado exitosamente',
        data: staffResponse
    });
};

const deactivateOrDeleteStaff = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // "deactivate" o "delete"

    // Buscar al usuario en la base de datos
    const staff = await Staff.findByPk(id); // Buscar por ID sin importar el estado
    if (!staff) {
        throw new CustomError('Usuario no encontrado', 404);
    }

    // Prevenir desactivación/eliminación del usuario owner principal
    if (staff.role === 'owner' && staff.id === 1) {
        throw new CustomError('No se puede modificar al usuario principal', 403);
    }

    if (req.method === 'DELETE' || action === 'delete') {
        // Eliminar permanentemente el registro
        await staff.destroy();
        return res.json({
            error: false,
            message: 'Usuario eliminado permanentemente',
        });
    } else if (action === 'deactivate') {
        // Desactivar el usuario
        await staff.update({
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: req.staff.id,
        });
        return res.json({
            error: false,
            message: 'Usuario desactivado exitosamente',
        });
    } else {
        throw new CustomError('Acción no válida', 400);
    }
};

module.exports = {
    getAllStaff,
    createStaff,
    updateStaff,
    deactivateOrDeleteStaff
};