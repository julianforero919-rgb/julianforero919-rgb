-- Script de esquema y datos SIDOVI. Ejecutar conectado a la base SIDOVI.
-- El usuario postgres y la base de datos se crean por separado.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: mensaje_postulacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mensaje_postulacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE NOTICE 'Nueva postulacion registrada';
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.mensaje_postulacion() OWNER TO postgres;

--
-- Name: validar_postulacion_unica(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_postulacion_unica() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM postulacion
        WHERE id_postulante = NEW.id_postulante
        AND id_vacante = NEW.id_vacante
    ) THEN
        RAISE EXCEPTION 'El postulante ya se ha postulado a esta vacante';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_postulacion_unica() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: documento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documento (
    id_documento integer NOT NULL,
    nombre_documento character varying(100) NOT NULL,
    tipo_documento character varying(50) NOT NULL,
    archivo text NOT NULL,
    id_postulante integer NOT NULL
);


ALTER TABLE public.documento OWNER TO postgres;

--
-- Name: documento_id_documento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documento_id_documento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documento_id_documento_seq OWNER TO postgres;

--
-- Name: documento_id_documento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documento_id_documento_seq OWNED BY public.documento.id_documento;


--
-- Name: entrevista; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entrevista (
    id_entrevista integer NOT NULL,
    fecha_entrevista date NOT NULL,
    observaciones text NOT NULL,
    resultado character varying(50) NOT NULL,
    id_postulacion integer NOT NULL,
    id_usuario integer NOT NULL
);


ALTER TABLE public.entrevista OWNER TO postgres;

--
-- Name: entrevista_id_entrevista_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entrevista_id_entrevista_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entrevista_id_entrevista_seq OWNER TO postgres;

--
-- Name: entrevista_id_entrevista_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entrevista_id_entrevista_seq OWNED BY public.entrevista.id_entrevista;


--
-- Name: evaluacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluacion (
    id_evaluacion integer NOT NULL,
    preguntas text NOT NULL,
    calificacion integer NOT NULL,
    comentarios text NOT NULL,
    id_entrevista integer NOT NULL
);


ALTER TABLE public.evaluacion OWNER TO postgres;

--
-- Name: evaluacion_id_evaluacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluacion_id_evaluacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluacion_id_evaluacion_seq OWNER TO postgres;

--
-- Name: evaluacion_id_evaluacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluacion_id_evaluacion_seq OWNED BY public.evaluacion.id_evaluacion;


--
-- Name: evidencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidencia (
    id_evidencia integer NOT NULL,
    tipo_evidencia character varying(50) NOT NULL,
    descripcion text NOT NULL,
    archivo text NOT NULL,
    id_postulacion integer NOT NULL
);


ALTER TABLE public.evidencia OWNER TO postgres;

--
-- Name: evidencia_id_evidencia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evidencia_id_evidencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evidencia_id_evidencia_seq OWNER TO postgres;

--
-- Name: evidencia_id_evidencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evidencia_id_evidencia_seq OWNED BY public.evidencia.id_evidencia;


--
-- Name: postulacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postulacion (
    id_postulacion integer NOT NULL,
    id_postulante integer NOT NULL,
    id_vacante integer NOT NULL,
    fecha_postulacion date NOT NULL,
    estado_postulacion character varying(50) NOT NULL
);


ALTER TABLE public.postulacion OWNER TO postgres;

--
-- Name: postulacion_id_postulacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.postulacion_id_postulacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.postulacion_id_postulacion_seq OWNER TO postgres;

--
-- Name: postulacion_id_postulacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.postulacion_id_postulacion_seq OWNED BY public.postulacion.id_postulacion;


--
-- Name: postulante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.postulante (
    id_postulante integer NOT NULL,
    nombre character varying(50) NOT NULL,
    apellido character varying(50) NOT NULL,
    documento character varying(20) NOT NULL,
    correo character varying(100) NOT NULL,
    telefono character varying(20) NOT NULL,
    direccion character varying(100) NOT NULL,
    fecha_registro date NOT NULL
);


ALTER TABLE public.postulante OWNER TO postgres;

--
-- Name: postulante_id_postulante_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.postulante_id_postulante_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.postulante_id_postulante_seq OWNER TO postgres;

--
-- Name: postulante_id_postulante_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.postulante_id_postulante_seq OWNED BY public.postulante.id_postulante;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nombre character varying(50) NOT NULL,
    apellido character varying(50) NOT NULL,
    correo character varying(100) NOT NULL,
    contrasena character varying(100) NOT NULL,
    rol character varying(50) NOT NULL,
    estado character varying(20) NOT NULL
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- Name: vacante; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vacante (
    id_vacante integer NOT NULL,
    titulo character varying(100) NOT NULL,
    descripcion text NOT NULL,
    requisitos text NOT NULL,
    fecha_publicacion date NOT NULL,
    estado character varying(20) NOT NULL,
    id_usuario integer NOT NULL
);


ALTER TABLE public.vacante OWNER TO postgres;

--
-- Name: vacante_id_vacante_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vacante_id_vacante_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vacante_id_vacante_seq OWNER TO postgres;

--
-- Name: vacante_id_vacante_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vacante_id_vacante_seq OWNED BY public.vacante.id_vacante;


--
-- Name: documento id_documento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documento ALTER COLUMN id_documento SET DEFAULT nextval('public.documento_id_documento_seq'::regclass);


--
-- Name: entrevista id_entrevista; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrevista ALTER COLUMN id_entrevista SET DEFAULT nextval('public.entrevista_id_entrevista_seq'::regclass);


--
-- Name: evaluacion id_evaluacion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion ALTER COLUMN id_evaluacion SET DEFAULT nextval('public.evaluacion_id_evaluacion_seq'::regclass);


--
-- Name: evidencia id_evidencia; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidencia ALTER COLUMN id_evidencia SET DEFAULT nextval('public.evidencia_id_evidencia_seq'::regclass);


--
-- Name: postulacion id_postulacion; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion ALTER COLUMN id_postulacion SET DEFAULT nextval('public.postulacion_id_postulacion_seq'::regclass);


--
-- Name: postulante id_postulante; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante ALTER COLUMN id_postulante SET DEFAULT nextval('public.postulante_id_postulante_seq'::regclass);


--
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- Name: vacante id_vacante; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vacante ALTER COLUMN id_vacante SET DEFAULT nextval('public.vacante_id_vacante_seq'::regclass);


--
-- Data for Name: documento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documento (id_documento, nombre_documento, tipo_documento, archivo, id_postulante) FROM stdin;
1	CV	PDF	ruta	1
2	CV	PDF	ruta	2
3	CV	PDF	ruta	3
4	CV	PDF	ruta	4
5	CV	PDF	ruta	5
6	CV	PDF	ruta	6
7	CV	PDF	ruta	7
8	CV	PDF	ruta	8
9	CV	PDF	ruta	9
10	CV	PDF	ruta	10
11	CV	PDF	ruta	11
12	CV	PDF	ruta	12
13	CV	PDF	ruta	13
14	CV	PDF	ruta	14
15	CV	PDF	ruta	15
16	CV	PDF	ruta	16
17	CV	PDF	ruta	17
18	CV	PDF	ruta	18
19	CV	PDF	ruta	19
20	CV	PDF	ruta	20
21	CV	PDF	ruta	21
22	CV	PDF	ruta	22
23	CV	PDF	ruta	23
24	CV	PDF	ruta	24
25	CV	PDF	ruta	25
26	CV	PDF	ruta	26
27	CV	PDF	ruta	27
28	CV	PDF	ruta	28
29	CV	PDF	ruta	29
30	CV	PDF	ruta	30
31	CV	PDF	ruta	31
32	CV	PDF	ruta	32
33	CV	PDF	ruta	33
34	CV	PDF	ruta	34
35	CV	PDF	ruta	35
36	CV	PDF	ruta	36
37	CV	PDF	ruta	37
38	CV	PDF	ruta	38
39	CV	PDF	ruta	39
40	CV	PDF	ruta	40
\.


--
-- Data for Name: entrevista; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entrevista (id_entrevista, fecha_entrevista, observaciones, resultado, id_postulacion, id_usuario) FROM stdin;
1	2024-04-01	Buena	Aprobado	41	3
2	2024-04-01	Buena	Aprobado	42	3
3	2024-04-01	Buena	Aprobado	43	3
4	2024-04-01	Buena	Aprobado	44	3
5	2024-04-01	Buena	Aprobado	45	3
6	2024-04-01	Buena	Aprobado	46	3
7	2024-04-01	Buena	Aprobado	47	3
8	2024-04-01	Buena	Aprobado	48	3
9	2024-04-01	Buena	Aprobado	49	3
10	2024-04-01	Buena	Aprobado	50	3
11	2024-04-01	Buena	Aprobado	51	3
12	2024-04-01	Buena	Aprobado	52	3
13	2024-04-01	Buena	Aprobado	53	3
14	2024-04-01	Buena	Aprobado	54	3
15	2024-04-01	Buena	Aprobado	55	3
16	2024-04-01	Buena	Aprobado	56	3
17	2024-04-01	Buena	Aprobado	57	3
18	2024-04-01	Buena	Aprobado	58	3
19	2024-04-01	Buena	Aprobado	59	3
20	2024-04-01	Buena	Aprobado	60	3
\.


--
-- Data for Name: evaluacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluacion (id_evaluacion, preguntas, calificacion, comentarios, id_entrevista) FROM stdin;
1	Preguntas	5	Excelente	1
2	Preguntas	5	Excelente	2
3	Preguntas	5	Excelente	3
4	Preguntas	5	Excelente	4
5	Preguntas	5	Excelente	5
6	Preguntas	5	Excelente	6
7	Preguntas	5	Excelente	7
8	Preguntas	5	Excelente	8
9	Preguntas	5	Excelente	9
10	Preguntas	5	Excelente	10
11	Preguntas	5	Excelente	11
12	Preguntas	5	Excelente	12
13	Preguntas	5	Excelente	13
14	Preguntas	5	Excelente	14
15	Preguntas	5	Excelente	15
16	Preguntas	5	Excelente	16
17	Preguntas	5	Excelente	17
18	Preguntas	5	Excelente	18
19	Preguntas	5	Excelente	19
20	Preguntas	5	Excelente	20
\.


--
-- Data for Name: evidencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evidencia (id_evidencia, tipo_evidencia, descripcion, archivo, id_postulacion) FROM stdin;
1	Foto	Evidencia	ruta	41
2	Foto	Evidencia	ruta	42
3	Foto	Evidencia	ruta	43
4	Foto	Evidencia	ruta	44
5	Foto	Evidencia	ruta	45
6	Foto	Evidencia	ruta	46
7	Foto	Evidencia	ruta	47
8	Foto	Evidencia	ruta	48
9	Foto	Evidencia	ruta	49
10	Foto	Evidencia	ruta	50
11	Foto	Evidencia	ruta	51
12	Foto	Evidencia	ruta	52
13	Foto	Evidencia	ruta	53
14	Foto	Evidencia	ruta	54
15	Foto	Evidencia	ruta	55
16	Foto	Evidencia	ruta	56
17	Foto	Evidencia	ruta	57
18	Foto	Evidencia	ruta	58
19	Foto	Evidencia	ruta	59
20	Foto	Evidencia	ruta	60
\.


--
-- Data for Name: postulacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.postulacion (id_postulacion, id_postulante, id_vacante, fecha_postulacion, estado_postulacion) FROM stdin;
41	1	1	2024-03-01	En proceso
42	2	2	2024-03-02	En proceso
43	3	3	2024-03-03	En proceso
44	4	4	2024-03-04	En proceso
45	5	5	2024-03-05	En proceso
46	6	6	2024-03-06	En proceso
47	7	7	2024-03-07	En proceso
48	8	8	2024-03-08	En proceso
49	9	9	2024-03-09	En proceso
50	10	10	2024-03-10	En proceso
51	11	11	2024-03-11	En proceso
52	12	12	2024-03-12	En proceso
53	13	13	2024-03-13	En proceso
54	14	14	2024-03-14	En proceso
55	15	15	2024-03-15	En proceso
56	16	16	2024-03-16	En proceso
57	17	17	2024-03-17	En proceso
58	18	18	2024-03-18	En proceso
59	19	19	2024-03-19	En proceso
60	20	20	2024-03-20	En proceso
61	1	1	2026-03-30	En proceso
64	1	6	2026-03-30	En proceso
\.


--
-- Data for Name: postulante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.postulante (id_postulante, nombre, apellido, documento, correo, telefono, direccion, fecha_registro) FROM stdin;
1	Luis	Arias	1001	luis1@gmail.com	300111	Dir1	2024-01-01
2	Maria	Bustos	1002	maria2@gmail.com	300112	Dir2	2024-01-02
3	Jose	Cano	1003	jose3@gmail.com	300113	Dir3	2024-01-03
4	Elena	Duran	1004	elena4@gmail.com	300114	Dir4	2024-01-04
5	Mario	Espitia	1005	mario5@gmail.com	300115	Dir5	2024-01-05
6	Rosa	Florez	1006	rosa6@gmail.com	300116	Dir6	2024-01-06
7	Hugo	Garcia	1007	hugo7@gmail.com	300117	Dir7	2024-01-07
8	Lina	Hernandez	1008	lina8@gmail.com	300118	Dir8	2024-01-08
9	Ivan	Ibarra	1009	ivan9@gmail.com	300119	Dir9	2024-01-09
10	Julia	Jimenez	1010	julia10@gmail.com	300120	Dir10	2024-01-10
11	Kevin	Lozano	1011	kevin11@gmail.com	300121	Dir11	2024-01-11
12	Laura	Mejia	1012	laura12@gmail.com	300122	Dir12	2024-01-12
13	Mateo	Navas	1013	mateo13@gmail.com	300123	Dir13	2024-01-13
14	Nora	Ocampo	1014	nora14@gmail.com	300124	Dir14	2024-01-14
15	Oscar	Pinto	1015	oscar15@gmail.com	300125	Dir15	2024-01-15
16	Patricia	Quintero	1016	patricia16@gmail.com	300126	Dir16	2024-01-16
17	Ricardo	Rico	1017	ricardo17@gmail.com	300127	Dir17	2024-01-17
18	Sandra	Soto	1018	sandra18@gmail.com	300128	Dir18	2024-01-18
19	Tomas	Tellez	1019	tomas19@gmail.com	300129	Dir19	2024-01-19
20	Ursula	Uribe	1020	ursula20@gmail.com	300130	Dir20	2024-01-20
21	Luis	Arias	1001	luis1@gmail.com	300111	Dir1	2024-01-01
22	Maria	Bustos	1002	maria2@gmail.com	300112	Dir2	2024-01-02
23	Jose	Cano	1003	jose3@gmail.com	300113	Dir3	2024-01-03
24	Elena	Duran	1004	elena4@gmail.com	300114	Dir4	2024-01-04
25	Mario	Espitia	1005	mario5@gmail.com	300115	Dir5	2024-01-05
26	Rosa	Florez	1006	rosa6@gmail.com	300116	Dir6	2024-01-06
27	Hugo	Garcia	1007	hugo7@gmail.com	300117	Dir7	2024-01-07
28	Lina	Hernandez	1008	lina8@gmail.com	300118	Dir8	2024-01-08
29	Ivan	Ibarra	1009	ivan9@gmail.com	300119	Dir9	2024-01-09
30	Julia	Jimenez	1010	julia10@gmail.com	300120	Dir10	2024-01-10
31	Kevin	Lozano	1011	kevin11@gmail.com	300121	Dir11	2024-01-11
32	Laura	Mejia	1012	laura12@gmail.com	300122	Dir12	2024-01-12
33	Mateo	Navas	1013	mateo13@gmail.com	300123	Dir13	2024-01-13
34	Nora	Ocampo	1014	nora14@gmail.com	300124	Dir14	2024-01-14
35	Oscar	Pinto	1015	oscar15@gmail.com	300125	Dir15	2024-01-15
36	Patricia	Quintero	1016	patricia16@gmail.com	300126	Dir16	2024-01-16
37	Ricardo	Rico	1017	ricardo17@gmail.com	300127	Dir17	2024-01-17
38	Sandra	Soto	1018	sandra18@gmail.com	300128	Dir18	2024-01-18
39	Tomas	Tellez	1019	tomas19@gmail.com	300129	Dir19	2024-01-19
40	Ursula	Uribe	1020	ursula20@gmail.com	300130	Dir20	2024-01-20
46	Ana	Lopez	1034567345	anaaaa@gmail.com	3245867302	carrera 12	2025-06-12
\.


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario (id_usuario, nombre, apellido, correo, contrasena, rol, estado) FROM stdin;
1	Ana	Lopez	ana1@gmail.com	123	Administrador	Activo
2	Juan	Perez	juan2@gmail.com	123	RRHH	Activo
3	Carlos	Gomez	carlos3@gmail.com	123	Gerente	Activo
4	Luisa	Martinez	luisa4@gmail.com	123	RRHH	Activo
5	Pedro	Ramirez	pedro5@gmail.com	123	Administrador	Activo
6	Sofia	Torres	sofia6@gmail.com	123	Gerente	Activo
7	Diego	Castro	diego7@gmail.com	123	RRHH	Activo
8	Laura	Vargas	laura8@gmail.com	123	Administrador	Activo
9	Andres	Moreno	andres9@gmail.com	123	Gerente	Activo
10	Camila	Rojas	camila10@gmail.com	123	RRHH	Activo
11	David	Diaz	david11@gmail.com	123	Administrador	Activo
12	Paula	Suarez	paula12@gmail.com	123	Gerente	Activo
13	Jorge	Mendez	jorge13@gmail.com	123	RRHH	Activo
14	Natalia	Herrera	natalia14@gmail.com	123	Administrador	Activo
15	Felipe	Ortega	felipe15@gmail.com	123	Gerente	Activo
16	Valentina	Silva	valentina16@gmail.com	123	RRHH	Activo
17	Miguel	Cruz	miguel17@gmail.com	123	Administrador	Activo
18	Daniela	Reyes	daniela18@gmail.com	123	Gerente	Activo
19	Oscar	Navarro	oscar19@gmail.com	123	RRHH	Activo
20	Sara	Pardo	sara20@gmail.com	123	Administrador	Activo
21	Ana	Lopez	ana1@gmail.com	123	Administrador	Activo
22	Juan	Perez	juan2@gmail.com	123	RRHH	Activo
23	Carlos	Gomez	carlos3@gmail.com	123	Gerente	Activo
24	Luisa	Martinez	luisa4@gmail.com	123	RRHH	Activo
25	Pedro	Ramirez	pedro5@gmail.com	123	Administrador	Activo
26	Sofia	Torres	sofia6@gmail.com	123	Gerente	Activo
27	Diego	Castro	diego7@gmail.com	123	RRHH	Activo
28	Laura	Vargas	laura8@gmail.com	123	Administrador	Activo
29	Andres	Moreno	andres9@gmail.com	123	Gerente	Activo
30	Camila	Rojas	camila10@gmail.com	123	RRHH	Activo
31	David	Diaz	david11@gmail.com	123	Administrador	Activo
32	Paula	Suarez	paula12@gmail.com	123	Gerente	Activo
33	Jorge	Mendez	jorge13@gmail.com	123	RRHH	Activo
34	Natalia	Herrera	natalia14@gmail.com	123	Administrador	Activo
35	Felipe	Ortega	felipe15@gmail.com	123	Gerente	Activo
36	Valentina	Silva	valentina16@gmail.com	123	RRHH	Activo
37	Miguel	Cruz	miguel17@gmail.com	123	Administrador	Activo
38	Daniela	Reyes	daniela18@gmail.com	123	Gerente	Activo
39	Oscar	Navarro	oscar19@gmail.com	123	RRHH	Activo
40	Sara	Pardo	sara20@gmail.com	123	Administrador	Activo
\.


--
-- Data for Name: vacante; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vacante (id_vacante, titulo, descripcion, requisitos, fecha_publicacion, estado, id_usuario) FROM stdin;
1	Desarrollador	Trabajo IT	Java	2024-02-01	Activa	1
2	Diseñador	UI/UX	Figma	2024-02-02	Activa	2
3	Contador	Finanzas	NIIF	2024-02-03	Activa	3
4	Analista	Datos	SQL	2024-02-04	Activa	4
5	Soporte	IT	Redes	2024-02-05	Activa	5
6	Tester	QA	Pruebas	2024-02-06	Activa	6
7	DevOps	Infra	Docker	2024-02-07	Activa	7
8	Marketing	Digital	SEO	2024-02-08	Activa	8
9	Ventas	Comercial	CRM	2024-02-09	Activa	9
10	HR	RRHH	Psicologia	2024-02-10	Activa	10
11	Admin	Admin	Office	2024-02-11	Activa	11
12	Seguridad	TI	ISO	2024-02-12	Activa	12
13	Backend	API	Node	2024-02-13	Activa	13
14	Frontend	Web	React	2024-02-14	Activa	14
15	DBA	BD	Postgres	2024-02-15	Activa	15
16	Mobile	Apps	Flutter	2024-02-16	Activa	16
17	AI	ML	Python	2024-02-17	Activa	17
18	Cloud	AWS	Cloud	2024-02-18	Activa	18
19	Legal	Abogado	Ley	2024-02-19	Activa	19
20	Logistica	Ops	Supply	2024-02-20	Activa	20
\.


--
-- Name: documento_id_documento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documento_id_documento_seq', 40, true);


--
-- Name: entrevista_id_entrevista_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entrevista_id_entrevista_seq', 20, true);


--
-- Name: evaluacion_id_evaluacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluacion_id_evaluacion_seq', 20, true);


--
-- Name: evidencia_id_evidencia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evidencia_id_evidencia_seq', 20, true);


--
-- Name: postulacion_id_postulacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.postulacion_id_postulacion_seq', 65, true);


--
-- Name: postulante_id_postulante_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.postulante_id_postulante_seq', 41, true);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 40, true);


--
-- Name: vacante_id_vacante_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vacante_id_vacante_seq', 20, true);


--
-- Name: documento documento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documento
    ADD CONSTRAINT documento_pkey PRIMARY KEY (id_documento);


--
-- Name: entrevista entrevista_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrevista
    ADD CONSTRAINT entrevista_pkey PRIMARY KEY (id_entrevista);


--
-- Name: evaluacion evaluacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion
    ADD CONSTRAINT evaluacion_pkey PRIMARY KEY (id_evaluacion);


--
-- Name: evidencia evidencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidencia
    ADD CONSTRAINT evidencia_pkey PRIMARY KEY (id_evidencia);


--
-- Name: postulacion postulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT postulacion_pkey PRIMARY KEY (id_postulacion);


--
-- Name: postulante postulante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulante
    ADD CONSTRAINT postulante_pkey PRIMARY KEY (id_postulante);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: vacante vacante_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vacante
    ADD CONSTRAINT vacante_pkey PRIMARY KEY (id_vacante);


--
-- Name: postulacion trigger_postulacion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_postulacion AFTER INSERT ON public.postulacion FOR EACH ROW EXECUTE FUNCTION public.mensaje_postulacion();


--
-- Name: postulacion trigger_validar_postulacion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validar_postulacion BEFORE INSERT ON public.postulacion FOR EACH ROW EXECUTE FUNCTION public.validar_postulacion_unica();


--
-- Name: documento documento_id_postulante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documento
    ADD CONSTRAINT documento_id_postulante_fkey FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: entrevista entrevista_id_postulacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrevista
    ADD CONSTRAINT entrevista_id_postulacion_fkey FOREIGN KEY (id_postulacion) REFERENCES public.postulacion(id_postulacion);


--
-- Name: entrevista entrevista_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entrevista
    ADD CONSTRAINT entrevista_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: evaluacion evaluacion_id_entrevista_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluacion
    ADD CONSTRAINT evaluacion_id_entrevista_fkey FOREIGN KEY (id_entrevista) REFERENCES public.entrevista(id_entrevista);


--
-- Name: evidencia evidencia_id_postulacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidencia
    ADD CONSTRAINT evidencia_id_postulacion_fkey FOREIGN KEY (id_postulacion) REFERENCES public.postulacion(id_postulacion);


--
-- Name: postulacion postulacion_id_postulante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT postulacion_id_postulante_fkey FOREIGN KEY (id_postulante) REFERENCES public.postulante(id_postulante);


--
-- Name: postulacion postulacion_id_vacante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.postulacion
    ADD CONSTRAINT postulacion_id_vacante_fkey FOREIGN KEY (id_vacante) REFERENCES public.vacante(id_vacante);


--
-- Name: vacante vacante_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vacante
    ADD CONSTRAINT vacante_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- PostgreSQL database dump complete
--


-- Tabla adicional del flujo de contratación de SIDOVI.
CREATE TABLE IF NOT EXISTS public.contrato (
    id_contrato integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    id_postulacion integer NOT NULL UNIQUE REFERENCES public.postulacion(id_postulacion),
    fecha_inicio date NOT NULL,
    fecha_fin date,
    tipo_contrato character varying(50) NOT NULL,
    salario numeric(12,2) NOT NULL,
    estado character varying(30) NOT NULL DEFAULT 'Borrador',
    observaciones text NOT NULL DEFAULT '',
    creado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS contrato_estado_idx ON public.contrato (estado);
