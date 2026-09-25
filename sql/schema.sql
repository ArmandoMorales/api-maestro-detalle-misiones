-- Esquema de referencia (las tablas ya existen en db_WebDevUMG)

CREATE TABLE Estudiantes (
    Carnet  VARCHAR(25)   NOT NULL PRIMARY KEY,
    Nombre  NVARCHAR(150) NOT NULL,
    Correo  NVARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE Misiones (
    MisionID    INT IDENTITY(1,1) PRIMARY KEY,
    Nombre      NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(250) NULL
);

CREATE TABLE EstudianteMisiones (
    DetalleID     INT IDENTITY(1,1) PRIMARY KEY,
    Carnet        VARCHAR(25) NOT NULL REFERENCES Estudiantes(Carnet),
    MisionID      INT         NOT NULL REFERENCES Misiones(MisionID),
    Estado        BIT         NOT NULL,
    FechaRegistro DATETIME    DEFAULT GETDATE(),
    CONSTRAINT UQ_EstudianteMision UNIQUE (Carnet, MisionID)
);
