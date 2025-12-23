export const DAILY_TIPS = [
    "Agregar piedras en el fondo de una maceta no mejora el drenaje; de hecho, puede atrapar agua y causar pudrición de raíces.",
    "Las plantas de interior necesitan menos agua en invierno debido a la menor evaporación y crecimiento más lento.",
    "Rota tus plantas cada semana para asegurar un crecimiento uniforme hacia la luz.",
    "El agua de lluvia es mejor que el agua del grifo para regar plantas debido a su pH natural.",
    "Las hojas amarillas generalmente indican exceso de riego, no falta de agua.",
    "La mayoría de las plantas de interior prefieren estar ligeramente secas antes del próximo riego.",
    "Limpia las hojas de tus plantas regularmente para mejorar la fotosíntesis y prevenir plagas.",
    "El exceso de fertilizante puede quemar las raíces; menos es más cuando se trata de nutrientes.",
    "Las plantas necesitan períodos de oscuridad para completar su ciclo de fotosíntesis correctamente.",
    "Agrupa plantas con necesidades similares de agua y luz para facilitar su cuidado.",
    "La tierra compactada impide el crecimiento de raíces; afloja la superficie ocasionalmente.",
    "Las corrientes de aire frío pueden estresar a las plantas tropicales; mantenlas alejadas de ventanas en invierno.",
    "Regar por la mañana permite que el exceso de agua se evapore durante el día.",
    "Las macetas de terracota absorben humedad; las plantas en ellas necesitan riego más frecuente.",
    "Observa las hojas: si se caen, puede ser falta de luz; si se marchitan, revisa el riego.",
    "La poda regular estimula el crecimiento y mantiene las plantas compactas y saludables.",
    "Usa agua a temperatura ambiente; el agua fría puede shock las raíces.",
    "Las plantas con hojas grandes necesitan más agua que las de hojas pequeñas.",
    "La humedad ambiental es tan importante como el riego para muchas plantas tropicales.",
    "Revisa el drenaje de tus macetas; el agua estancada es la causa #1 de muerte en plantas.",
    "Las plantas jóvenes necesitan más atención que las establecidas; sé paciente.",
    "La luz indirecta brillante es ideal para la mayoría de las plantas de interior.",
    "Fertiliza solo durante la temporada de crecimiento (primavera y verano).",
    "Las raíces que salen por los agujeros de drenaje indican que es hora de trasplantar.",
    "Aclimata gradualmente las plantas a nuevas condiciones de luz para evitar quemaduras.",
    "Las plantas suculentas almacenan agua en sus hojas; riega solo cuando la tierra esté completamente seca.",
    "Un ventilador suave mejora la circulación de aire y fortalece los tallos.",
    "Las plagas prefieren plantas débiles; mantén tus plantas saludables para prevenir infestaciones.",
    "Investiga las necesidades específicas de cada planta; no todas requieren el mismo cuidado.",
    "La paciencia es clave en la jardinería; las plantas crecen a su propio ritmo.",
];

export const getDailyTip = (): string => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / 86400000);

    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
};
