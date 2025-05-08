// import api from './axios';

// export const sendEmailNotification = async (email, subject, message) => {
//     try {
//         const response = await api.post('notification/email', {
//             email,
//             subject,
//             message,
//         });

//         if (response.data.success) {
//             console.log('Correo enviado correctamente');
//         } else {
//             console.error('Error al enviar el correo:', response.data.message);
//         }
//     } catch (error) {
//         console.error('Error al realizar la solicitud:', error);
//     }
// };