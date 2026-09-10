import Entrada from './pages/Entrada';
import Inventario from './pages/Inventario';
import Autorizacao from './pages/Autorizacao';
import Saida from './pages/Saida';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Entrada": Entrada,
    "Inventario": Inventario,
    "Autorizacao": Autorizacao,
    "Saida": Saida,
}

export const pagesConfig = {
    mainPage: "Inventario",
    Pages: PAGES,
    Layout: __Layout,
};