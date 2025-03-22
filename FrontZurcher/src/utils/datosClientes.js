const clientes = [
    {
        id: 1, // Unique ID for the client
        numeroDeTrabajo: "2025-001", // N° de trabajo
        nombreCompleto: "Juan Perez",
        email: "juan.perez@example.com",
        telefono: "123-456-7890",
        direccion: "123 Main St",
        ciudad: "Anytown",
        etapaDeTrabajo:  "Presupuesto",
        presupuesto: {
            enviado: true,
            importe: 1500.00,
            aprobado: true,
        },
        pago: {
            realizado: true,
            importePagado: 1500.00,
            importeRestante: 0.00,
            fechaPago: "2025-03-08",
        },
        materiales:{
           compraMateriales: true,
           fechaCompra: "2025-03-10", 
        },
        inspeccion: {
            solicitada: true,
            realizada: false,
            fechaSolicitud: "2025-03-15",
            fechaRealizacion: null,
        },
        inspeccionFinal: {
            solicitada: true,
            realizada: false,
            fechaSolicitud: "2025-03-15",
            fechaRealizacion: null,
        },
    
        trabajoTerminado: false,
    },
    {
        id: 2, // Unique ID for the client
        numeroDeTrabajo: "2025-002", // N° de trabajo
        nombreCompleto: "Maria Rodriguez",
        email: "maria.rodriguez@example.com",
        telefono: "456-789-0123",
        direccion: "456 Elm St",
        ciudad: "Springfield",
        etapaDeTrabajo:  "Terminado",
        presupuesto: {
            enviado: true,
            importe: 2200.50,
            aprobado: false,
        },
        pago: {
            realizado: false,
            importePagado: 0.00,
            importeRestante: 0.00,
            fechaPago: null,
        },
        materiales:{
            compraMateriales: true,
            fechaCompra: "2025-03-10", 
         },
        inspeccion: {
            solicitada: false,
            realizada: false,
            fechaSolicitud: null,
            fechaRealizacion: null,
        },
        inspeccionFinal: {
            solicitada: true,
            realizada: false,
            fechaSolicitud: "2025-03-15",
            fechaRealizacion: null,
        },
    
        trabajoTerminado: false,
    },
    {
        id: 3, // Unique ID for the client
        numeroDeTrabajo: "2025-003", // N° de trabajo
        nombreCompleto: "Carlos Gomez",
        email: "carlos.gomez@example.com",
        telefono: "789-012-3456",
        direccion: "789 Oak St",
        ciudad: "Oakland",
        etapaDeTrabajo: "Instalación",
        presupuesto: {
            enviado: false,
            importe: 0.00,
            aprobado: false,
        },
        pago: {
            realizado: false,
            importePagado: 0.00,
            importeRestante: 0.00,
            fechaPago: null,
        },
        materiales:{
            compraMateriales: true,
            fechaCompra: "2025-03-10", 
         },
        inspeccion: {
            solicitada: false,
            realizada: false,
            fechaSolicitud: null,
            fechaRealizacion: null,
        },
        inspeccionFinal: {
            solicitada: true,
            realizada: false,
            fechaSolicitud: "2025-03-15",
            fechaRealizacion: null,
        },
    
        trabajoTerminado: false,
    },
];


export default clientes;